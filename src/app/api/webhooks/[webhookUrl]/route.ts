import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerWebhookFields } from '@/lib/webhook-fields';
import { z } from 'zod';
import { log } from '@/lib/logging';
import { Prisma } from '@prisma/client';
import { processWebhookVariables } from '@/utils/variableReplacer';
import { Filter } from '@/types/filters';
import { evaluateFilters, normalizeWebhookData } from '@/lib/filter-utils';
import { decrypt } from '@/lib/encryption';
import { hasValidPaymentMethod, updateCreditBalance, reportScenarioUsage } from '@/lib/stripe';
import { cache } from 'react';
import process from 'process';

export const dynamic = 'force-dynamic';

// Cache frequently accessed data
const getOrganizationData = cache(async (webhookUrl: string) => {
  return prisma.organization.findUnique({
    where: { webhookUrl },
    select: {
      id: true,
      name: true,
      webhookUrl: true,
      outboundWebhookUrl: true,
      billingPlan: true,
      creditBalance: true,
      ghlIntegrations: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          locationId: true,
          locationName: true
        }
      },
      socialAccounts: {
        where: { isActive: true },
        select: {
          id: true,
          username: true,
          name: true,
          provider: true,
          unipileAccountId: true
        }
      },
      emailAccounts: {
        where: { isActive: true },
        select: {
          id: true,
          email: true,
          name: true,
          unipileAccountId: true
        }
      },
      prompts: true
    }
  });
});

// Webhook schema
const webhookSchema = z.object({
  make_sequence: z.string().optional(),
  'Current Scenario ': z.string().optional(),
  contact_id: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  'Email Sender': z.string().optional(),
  company_name: z.string().optional(),
  customData: z.object({
    webhookURL: z.string().optional(),
    type: z.enum(['enrollment', 'reply', 'positive_reply']).optional(),
    replyType: z.enum(['positive', 'negative', 'neutral']).optional()
  }).optional(),
}).passthrough();

interface OutboundData {
  contactData: any;
  scenarioData: {
    id: string;
    name: string;
    touchpointType: string;
    customizationPrompt: string | null;
    emailExamplesPrompt: string | null;
    subjectLine: string | null;
    followUp: boolean;
    attachment: string | null;
    attachmentName: string | null;
    snippet: string | null;
  };
  prompts: Record<string, string>;
  emailInfo: {
    matchedAccount?: {
      email: string;
      name: string;
      unipileAccountId: string;
    };
    allAccounts?: Array<{
      email: string;
      name: string;
      unipileAccountId: string;
    }>;
    error?: string;
  };
  socialAccounts: Array<{
    name: string;
    accountId: string;
    provider: string;
  }>;
  crmData: Record<string, any>; // Placeholder for future CRM data
}

async function processWebhookAsync(
  webhookLog: any,
  data: any,
  organization: any,
  outboundWebhookUrl: string,
  validatedWebhookUrl: string
) {
  try {
    const scenarioName = data['Current Scenario '] || data['Current Scenario'] || data.make_sequence;
    
    log('info', 'Processing webhook asynchronously', { 
      webhookLogId: webhookLog.id,
      scenarioName,
      currentStatus: webhookLog.status
    });

    // Calculate the cutoff time for stalled webhooks (5 minutes ago)
    const stalledCutoff = new Date();
    stalledCutoff.setMinutes(stalledCutoff.getMinutes() - 5);

    // Try to acquire processing lock with atomic operation
    const canProcess = await prisma.$transaction(async (tx) => {
      // Check for any currently processing webhooks
      const processingWebhook = await tx.webhookLog.findFirst({
        where: {
          organizationId: organization.id,
          status: 'processing',
          createdAt: {
            gt: stalledCutoff // Only consider recent webhooks
          },
          NOT: {
            id: webhookLog.id
          }
        },
        select: {
          id: true,
          status: true,
          createdAt: true
        }
      });

      if (processingWebhook) {
        // Log detailed information about the blocking webhook
        log('info', 'Webhook blocked by another processing webhook', {
          organizationId: organization.id,
          currentWebhookId: webhookLog.id,
          blockingWebhookId: processingWebhook.id,
          blockingCreatedAt: processingWebhook.createdAt,
          currentCreatedAt: webhookLog.createdAt
        });
        return false;
      }

      // Check for earlier webhooks that should be processed first
      const earlierWebhook = await tx.webhookLog.findFirst({
        where: {
          organizationId: organization.id,
          status: 'received',
          createdAt: {
            lt: webhookLog.createdAt
          }
        },
        orderBy: {
          createdAt: 'asc'
        },
        select: {
          id: true,
          createdAt: true
        }
      });

      if (earlierWebhook) {
        // Log information about the earlier webhook
        log('info', 'Earlier webhook needs processing first', {
          organizationId: organization.id,
          currentWebhookId: webhookLog.id,
          earlierWebhookId: earlierWebhook.id,
          earlierCreatedAt: earlierWebhook.createdAt,
          currentCreatedAt: webhookLog.createdAt
        });
        return false;
      }

      // Log the status change
      log('info', 'Updating webhook status to processing', {
        webhookId: webhookLog.id,
        oldStatus: webhookLog.status,
        newStatus: 'processing',
        timestamp: new Date()
      });

      // No blocking webhooks found, we can proceed
      await tx.webhookLog.update({
        where: { id: webhookLog.id },
        data: { 
          status: 'processing'
        }
      });

      return true;
    });

    if (!canProcess) {
      log('info', 'Webhook queued for later processing', {
        webhookId: webhookLog.id,
        status: webhookLog.status,
        createdAt: webhookLog.createdAt
      });
      return;
    }

    let scenario;
    try {
      scenario = await prisma.scenario.findFirst({
        where: {
          organizationId: organization.id,
          name: scenarioName
        },
        include: {
          attachment: true,
          snippet: true,
          signature: true
        }
      });

      if (!scenario) {
        throw new Error(`Scenario "${scenarioName}" not found`);
      }

      // Evaluate filters early if present
      let filterEvaluation = null;
      if (scenario.filters) {
        // Parse filters if they're stored as a string
        let parsedFilters;
        try {
          parsedFilters = typeof scenario.filters === 'string' 
            ? JSON.parse(scenario.filters)
            : scenario.filters;

          log('info', 'Parsed scenario filters', {
            original: scenario.filters,
            parsed: parsedFilters,
            type: typeof parsedFilters
          });
        } catch (e) {
          log('error', 'Failed to parse filters', { 
            filters: scenario.filters,
            error: String(e)
          });
          parsedFilters = [];
        }

        if (Array.isArray(parsedFilters) && parsedFilters.length > 0) {
          // Cast filters to the correct type with type guards
          const typedFilters = parsedFilters
            .filter((f): f is { field: string; operator: string; value?: string } => 
              typeof f === 'object' && f !== null && 
              'field' in f && 'operator' in f)
            .map(f => ({
              field: String(f.field),
              operator: String(f.operator),
              value: f.value ? String(f.value) : undefined
            })) as Filter[];

          log('info', 'Processing filters', {
            scenarioName: scenario.name,
            filterCount: typedFilters.length,
            filters: typedFilters
          });

          // Normalize webhook data
          const normalizedData = normalizeWebhookData(data);
          filterEvaluation = await evaluateFilters(typedFilters, normalizedData);
          
          // Log filter evaluation results
          log('info', 'Filter evaluation results', {
            scenarioName: scenario.name,
            passed: filterEvaluation.passed,
            summary: filterEvaluation.summary,
            results: filterEvaluation.results,
            data: normalizedData
          });

          // If filters didn't pass, update log and return
          if (!filterEvaluation.passed) {
            await prisma.webhookLog.update({
              where: { id: webhookLog.id },
              data: {
                status: 'blocked',
                responseBody: {
                  error: 'Blocked by filters',
                  filterEvaluation: {
                    results: filterEvaluation.results,
                    summary: filterEvaluation.summary
                  },
                  scenario: {
                    name: scenario.name,
                    filters: typedFilters
                  }
                } as Record<string, any>
              }
            });
            throw new Error('Blocked by filters');
          }
        }
      }

      // Process webhook variables in scenario fields
      const processedScenario = {
        id: scenario.id,
        name: scenario.name,
        touchpointType: scenario.touchpointType,
        filters: scenario.filters,
        filterEvaluation,
        customizationPrompt: scenario.customizationPrompt ? processWebhookVariables(scenario.customizationPrompt, data) : null,
        emailExamplesPrompt: scenario.emailExamplesPrompt ? processWebhookVariables(scenario.emailExamplesPrompt, data) : null,
        subjectLine: scenario.subjectLine ? processWebhookVariables(scenario.subjectLine, data) : null,
        followUp: scenario.isFollowUp || false,
        attachment: scenario.attachment?.content || null,
        attachmentName: scenario.attachment?.name || null,
        snippet: scenario.snippet?.content || null
      };

      // Use pre-fetched prompts from organization data
      const processedPrompts = organization.prompts.reduce((acc: Record<string, string>, prompt: { name: string; content: string }) => {
        acc[prompt.name] = processWebhookVariables(prompt.content, data);
        return acc;
      }, {} as Record<string, string>);

      // Process email accounts based on Email Sender
      let emailInfo: any = {};
      if (data['Email Sender']) {
        const matchedAccount = organization.emailAccounts.find(
          (account: { email: string }) => account.email === data['Email Sender']
        );
        
        if (!matchedAccount) {
          throw new Error(`No active email account found matching sender: ${data['Email Sender']}`);
        }
        
        emailInfo.matchedAccount = {
          email: matchedAccount.email,
          name: matchedAccount.name,
          unipileAccountId: matchedAccount.unipileAccountId || ''
        };
      } else {
        emailInfo.allAccounts = organization.emailAccounts.map(
          (account: { email: string; name: string; unipileAccountId: string | null }) => ({
            email: account.email,
            name: account.name,
            unipileAccountId: account.unipileAccountId || ''
          })
        );
      }

      // Process social accounts (always include, even if empty)
      const socialAccounts = (organization.socialAccounts || []).map(
        (account: { name: string; username: string; provider: string }) => ({
          name: account.name,
          accountId: account.username,
          provider: account.provider
        })
      );

      // Prepare outbound data with all required information
      const outboundData = {
        contactData: {
          ...data,
          ...(scenario.testMode && scenario.testEmail && {
            email: scenario.testEmail,
            contact_id: ''
          })
        },
        scenarioData: processedScenario,
        filterInfo: filterEvaluation ? {
          passed: filterEvaluation.passed,
          summary: filterEvaluation.summary,
          results: filterEvaluation.results
        } : null,
        prompts: processedPrompts,
        emailInfo,
        socialAccounts,
        crmData: {}
      };

      // Send outbound webhook
      const outboundResponse = await fetch(validatedWebhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ProfitReach-API'
        },
        body: JSON.stringify(outboundData)
      });

      // Log response headers for debugging
      const responseHeaders: Record<string, string> = {};
      outboundResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      // Get response text first for better error logging
      const responseText = await outboundResponse.text();
      log('info', 'Outbound webhook response', { 
        status: outboundResponse.status,
        headers: responseHeaders,
        response: responseText,
        url: validatedWebhookUrl
      });

      if (!outboundResponse.ok) {
        throw new Error(`Outbound webhook failed with status ${outboundResponse.status}`);
      }

      // Try to parse as JSON only if it looks like JSON
      let responseData: any = responseText;
      if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          log('warn', 'Failed to parse response as JSON, using raw text', { error: String(e) });
        }
      }

      // Update webhook log with success
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { 
          status: scenario.testMode ? 'testing' : 'success',
          responseBody: {
            ...responseData,
            filterInfo: filterEvaluation ? {
              passed: filterEvaluation.passed,
              summary: filterEvaluation.summary,
              results: filterEvaluation.results
            } : null,
            scenario: {
              name: scenario.name,
              filters: scenario.filters
            }
          } as Record<string, any>
        }
      });

      // Handle credit usage for non-test mode
      if (
        !scenario.testMode &&
        organization.billingPlan === 'at_cost'
      ) {
        try {
          await reportScenarioUsage(organization.id);
        } catch (error) {
          log('error', 'Error reporting scenario usage:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            organizationId: organization.id,
            webhookLogId: webhookLog.id
          });
        }
      }

    } catch (error) {
      // Update webhook log with error
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { 
          status: 'error',
          responseBody: { 
            error: error instanceof Error ? error.message : 'Unknown error'
          } as Prisma.JsonObject
        }
      });
      throw error;
    }
  } catch (error) {
    log('error', 'Async webhook processing failed', {
      error: error instanceof Error ? error.message : String(error),
      webhookLogId: webhookLog.id
    });
  }
}

// Webhook processing states
const WEBHOOK_STATES = {
  RECEIVED: 'received',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
  BLOCKED: 'blocked'
} as const;

export async function POST(
  request: Request,
  { params }: { params: { webhookUrl: string } }
) {
  try {
    if (!params.webhookUrl || params.webhookUrl.length < 32) {
      log('error', 'Invalid webhook URL format', { webhookUrl: params.webhookUrl });
      return NextResponse.json(
        { error: 'Invalid webhook URL format' },
        { status: 400 }
      );
    }

    const clonedRequest = request.clone();
    const rawData = await clonedRequest.json();
    const validationResult = webhookSchema.safeParse(rawData);
    const data = validationResult.success ? validationResult.data : rawData;

    // Use cached organization data fetch
    const organization = await getOrganizationData(params.webhookUrl);

    if (!organization) {
      log('error', 'Organization not found', { webhookUrl: params.webhookUrl });
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 404 }
      );
    }

    // Get the most recent GHL integration
    const ghlIntegration = organization.ghlIntegrations[0];

    // Create initial webhook log
    const webhookLog = await prisma.webhookLog.create({
      data: {
        accountId: data.contact_id || 'unknown',
        organizationId: organization.id,
        status: WEBHOOK_STATES.RECEIVED,
        scenarioName: data['Current Scenario '] || data['Current Scenario'] || data.make_sequence || 'unknown',
        contactEmail: data.email || 'Unknown',
        contactName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown',
        company: data.company_name || 'Unknown',
        requestBody: data as unknown as Prisma.JsonObject,
        responseBody: { status: WEBHOOK_STATES.RECEIVED } as Prisma.JsonObject,
        ...(ghlIntegration && { ghlIntegrationId: ghlIntegration.id })
      }
    });

    // Log webhook receipt
    log('info', 'Webhook received', {
      webhookId: webhookLog.id,
      organizationId: organization.id,
      scenarioName: webhookLog.scenarioName
    });

    // Queue webhook to N8N for processing
    try {
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
      if (!n8nWebhookUrl) {
        throw new Error('N8N webhook URL not configured');
      }

      // Send to N8N queue
      const queueResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhookLogId: webhookLog.id,
          organizationId: organization.id,
          data: data,
          outboundWebhookUrl: organization.outboundWebhookUrl
        })
      });

      if (!queueResponse.ok) {
        throw new Error(`Failed to queue webhook: ${queueResponse.statusText}`);
      }

      // Update status to queued
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: WEBHOOK_STATES.QUEUED,
          responseBody: { status: WEBHOOK_STATES.QUEUED } as Prisma.JsonObject
        }
      });

      // Return immediate success response
      return NextResponse.json({ 
        status: 'success',
        message: 'Webhook received and queued for processing',
        webhookId: webhookLog.id
      });

    } catch (error) {
      // Log queueing error but don't fail the request
      log('error', 'Failed to queue webhook', {
        error: error instanceof Error ? error.message : String(error),
        webhookId: webhookLog.id
      });

      // Update webhook log with error
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: WEBHOOK_STATES.ERROR,
          responseBody: { 
            error: 'Failed to queue webhook',
            details: error instanceof Error ? error.message : 'Unknown error'
          } as Prisma.JsonObject
        }
      });

      // Still return success to the client
      return NextResponse.json({ 
        status: 'success',
        message: 'Webhook received but queueing delayed',
        webhookId: webhookLog.id
      });
    }

  } catch (error) {
    log('error', 'Error processing webhook', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Add this new endpoint
export async function PATCH(
  request: Request,
  { params }: { params: { webhookUrl: string } }
) {
  try {
    const data = await request.json();
    const { status, responseBody } = data;

    // Validate status
    const allowedStatuses = ['received', 'queued', 'processing', 'success', 'error', 'blocked'];
    if (!status || !allowedStatuses.includes(status)) {
      log('error', 'Invalid status provided', { status });
      return NextResponse.json(
        { error: 'Invalid status. Allowed values: ' + allowedStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Attempt update
    const updated = await prisma.webhookLog.update({
      where: { id: params.webhookUrl },
      data: {
        status,
        responseBody: responseBody as Prisma.JsonObject
      },
      select: {
        id: true,
        status: true
      }
    });

    // Verify update
    if (!updated || updated.status !== status) {
      log('error', 'Failed to update webhook status', { 
        webhookId: params.webhookUrl,
        requestedStatus: status,
        actualStatus: updated?.status 
      });
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    log('info', 'Successfully updated webhook status', {
      webhookId: params.webhookUrl,
      status: updated.status
    });

    return NextResponse.json({ 
      success: true,
      status: updated.status 
    });

  } catch (error) {
    log('error', 'Failed to update webhook status', { 
      error: String(error),
      webhookId: params.webhookUrl 
    });
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
} 
