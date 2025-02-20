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
import PQueue from 'p-queue';

export const dynamic = 'force-dynamic';

// Create a queue with concurrency limit
const queue = new PQueue({
  concurrency: 2, // Process 2 webhooks at a time
  timeout: 60000, // 1 minute timeout
  throwOnTimeout: false
});

// Add queue error handling
queue.on('error', (error) => {
  log('error', 'Queue processing error:', {
    error: error instanceof Error ? error.message : String(error)
  });
});

// Add queue events for monitoring
queue.on('active', () => {
  log('info', 'Queue status:', {
    size: queue.size,
    pending: queue.pending,
    isPaused: queue.isPaused
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
    // Find the scenario to check test mode
    const scenarioName = data['Current Scenario '] || data['Current Scenario'] || data.make_sequence;
    
    log('info', 'Processing webhook asynchronously', { 
      webhookLogId: webhookLog.id,
      scenarioName,
      queueSize: queue.size,
      queuePending: queue.pending
    });

    // Update status to processing
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: { status: 'processing' }
    });

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

      // Fetch and process prompts
      const prompts = await prisma.prompt.findMany({
        where: { organizationId: organization.id }
      });
      const processedPrompts = prompts.reduce((acc, prompt) => {
        acc[prompt.name] = processWebhookVariables(prompt.content, data);
        return acc;
      }, {} as Record<string, string>);

      // Process email accounts based on email sender
      const emailInfo: OutboundData['emailInfo'] = {};
      if (data['Email Sender']) {
        const matchedAccount = await prisma.emailAccount.findFirst({
          where: {
            organizationId: organization.id,
            email: data['Email Sender'],
            isActive: true
          }
        });
        
        if (!matchedAccount) {
          const error = `No active email account found matching sender: ${data['Email Sender']}`;
          await prisma.webhookLog.update({
            where: { id: webhookLog.id },
            data: { 
              status: 'error',
              responseBody: { error } as Prisma.JsonObject
            }
          });
          throw new Error(error);
        }
        
        emailInfo.matchedAccount = {
          email: matchedAccount.email,
          name: matchedAccount.name,
          unipileAccountId: matchedAccount.unipileAccountId || ''
        };
      } else {
        emailInfo.allAccounts = (await prisma.emailAccount.findMany({
          where: {
            organizationId: organization.id,
            isActive: true
          }
        }))
          .map(account => ({
            email: account.email,
            name: account.name,
            unipileAccountId: account.unipileAccountId || ''
          }));
      }

      // Get all active social accounts
      const socialAccounts = organization.socialAccounts.map((account: { name: string; username: string; provider: string }) => ({
        name: account.name,
        accountId: account.username,
        provider: account.provider
      }));

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
        crmData: {} // Placeholder for future CRM data
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

export async function POST(
  request: Request,
  { params }: { params: { webhookUrl: string } }
) {
  try {
    // Validate webhook URL format
    if (!params.webhookUrl || params.webhookUrl.length < 32) {
      log('error', 'Invalid webhook URL format', { webhookUrl: params.webhookUrl });
      return NextResponse.json(
        { error: 'Invalid webhook URL format' },
        { status: 400 }
      );
    }

    // Clone request for multiple reads
    const clonedRequest = request.clone();
    
    // Parse webhook data early to get contact information
    const rawData = await clonedRequest.json();
    const validationResult = webhookSchema.safeParse(rawData);
    const data = validationResult.success ? validationResult.data : rawData;

    // Find organization by webhook URL
    const organization = await prisma.organization.findUnique({
      where: { webhookUrl: params.webhookUrl },
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
        socialAccounts: true
      }
    });

    if (!organization) {
      log('error', 'Organization not found', { webhookUrl: params.webhookUrl });
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 404 }
      );
    }

    // Get the most recent GHL integration
    const ghlIntegration = organization.ghlIntegrations[0];
    if (!ghlIntegration) {
      log('warn', 'No GHL integration found', { organizationId: organization.id });
    }

    // Create initial webhook log
    const webhookLog = await prisma.webhookLog.create({
      data: {
        accountId: data.contact_id || 'unknown',
        organizationId: organization.id,
        status: 'queued', // Changed from 'received' to 'queued'
        scenarioName: data['Current Scenario '] || data['Current Scenario'] || data.make_sequence || 'unknown',
        contactEmail: data.email || 'Unknown',
        contactName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown',
        company: data.company_name || 'Unknown',
        requestBody: data as unknown as Prisma.JsonObject,
        responseBody: { 
          status: 'queued',
          queueSize: queue.size,
          queuePending: queue.pending
        } as Prisma.JsonObject,
        ...(ghlIntegration && { ghlIntegrationId: ghlIntegration.id })
      }
    });

    // Add detailed logging for scenario name resolution
    log('info', 'Webhook queued', {
      webhookLogId: webhookLog.id,
      scenarioName: data['Current Scenario '] || data['Current Scenario'] || data.make_sequence || 'unknown',
      queueSize: queue.size,
      queuePending: queue.pending
    });

    // Use organization's outbound webhook URL
    const outboundWebhookUrl = organization.outboundWebhookUrl;
    
    if (!outboundWebhookUrl) {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { 
          status: 'error',
          responseBody: { 
            error: 'No outbound webhook URL configured. Please configure it in the settings page.' 
          } as Prisma.JsonObject
        }
      });
      return NextResponse.json({ 
        message: 'Fields registered but no outbound webhook URL configured',
        fieldsRegistered: true,
        error: 'Please configure the outbound webhook URL in the settings page'
      });
    }

    // Validate and fix webhook URL
    let validatedWebhookUrl = outboundWebhookUrl;
    try {
      new URL(outboundWebhookUrl);
    } catch (e) {
      validatedWebhookUrl = `https://app.messagelm.com${outboundWebhookUrl.startsWith('/') ? '' : '/'}${outboundWebhookUrl}`;
    }

    // Add to processing queue
    queue.add(() => 
      processWebhookAsync(webhookLog, data, organization, outboundWebhookUrl, validatedWebhookUrl)
    ).catch(error => {
      log('error', 'Queue processing error:', {
        error: error instanceof Error ? error.message : String(error),
        webhookLogId: webhookLog.id
      });
    });

    // Return immediate success response with queue information
    return NextResponse.json({ 
      status: 'queued',
      message: 'Webhook received and queued for processing',
      webhookId: webhookLog.id,
      queueInfo: {
        size: queue.size,
        pending: queue.pending
      }
    });

  } catch (error) {
    log('error', 'Error processing webhook', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
} 
