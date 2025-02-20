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

export const dynamic = 'force-dynamic';

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
      scenarioName
    });

    // Update status to processing
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: { status: 'processing' }
    });

    // Rest of your existing processing logic here
    let scenario;
    try {
      scenario = await prisma.scenario.findFirst({
        where: {
          organizationId: organization.id,
          name: scenarioName
        },
        include: {
          attachment: true,
          snippet: true
        }
      });

      if (!scenario) {
        throw new Error(`Scenario "${scenarioName}" not found`);
      }

      // Process webhook variables in scenario fields
      const processedScenario = {
        id: scenario.id,
        name: scenario.name,
        touchpointType: scenario.touchpointType,
        customizationPrompt: scenario.customizationPrompt ? processWebhookVariables(scenario.customizationPrompt, data) : null,
        emailExamplesPrompt: scenario.emailExamplesPrompt ? processWebhookVariables(scenario.emailExamplesPrompt, data) : null,
        subjectLine: scenario.subjectLine ? processWebhookVariables(scenario.subjectLine, data) : null,
        followUp: scenario.isFollowUp || false,
        attachment: scenario.attachment?.content || null,
        attachmentName: scenario.attachment?.name || null,
        snippet: scenario.snippet?.content || null
      };

      // Prepare outbound data
      const outboundData = {
        contactData: data,
        scenarioData: processedScenario,
        prompts: {},  // You'll need to add your prompts processing logic here
        emailInfo: {},
        socialAccounts: organization.socialAccounts || [],
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

      if (!outboundResponse.ok) {
        throw new Error(`Outbound webhook failed with status ${outboundResponse.status}`);
      }

      // Update webhook log with success
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { 
          status: 'success',
          responseBody: { success: true } as Prisma.JsonObject
        }
      });

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
        status: 'received',
        scenarioName: data['Current Scenario '] || data['Current Scenario'] || data.make_sequence || 'unknown',
        contactEmail: data.email || 'Unknown',
        contactName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown',
        company: data.company_name || 'Unknown',
        requestBody: data as unknown as Prisma.JsonObject,
        responseBody: { status: 'received' } as Prisma.JsonObject,
        ...(ghlIntegration && { ghlIntegrationId: ghlIntegration.id })
      }
    });

    // Add detailed logging for scenario name resolution
    log('info', 'Scenario name resolution', {
      currentScenarioWithSpace: data['Current Scenario '],
      currentScenarioNoSpace: data['Current Scenario'],
      makeSequence: data.make_sequence,
      resolvedScenarioName: data['Current Scenario '] || data['Current Scenario'] || data.make_sequence || 'unknown'
    });

    // Add detailed billing plan logging
    log('info', 'Organization billing details', {
      organizationId: organization.id,
      billingPlan: organization.billingPlan,
      billingPlanType: typeof organization.billingPlan,
      creditBalance: organization.creditBalance,
      rawBillingPlan: JSON.stringify(organization.billingPlan)
    });

    // Check payment method for at-cost plan
    if (organization.billingPlan?.toLowerCase().trim() === 'at_cost') {
      // Skip payment method check if they have credits
      if (organization.creditBalance <= 0) {
        const hasPaymentMethod = await hasValidPaymentMethod(organization.id);
        if (!hasPaymentMethod) {
          // Update webhook log to blocked status
          await prisma.webhookLog.update({
            where: { id: webhookLog.id },
            data: {
              status: 'blocked',
              responseBody: {
                error: 'No valid payment method found',
                details: 'Please add a payment method in billing settings to use the at-cost plan'
              } as Prisma.JsonObject
            }
          });

          return NextResponse.json({ 
            error: 'No valid payment method found',
            details: 'Please add a payment method in billing settings to use the at-cost plan'
          }, { status: 402 });
        }
      }

      // Check and reserve credit in a transaction
      try {
        await prisma.$transaction(async (tx) => {
          const org = await tx.organization.findUnique({
            where: { id: organization.id },
            select: { creditBalance: true }
          });

          if (!org || org.creditBalance < 1) {
            throw new Error('Insufficient credits');
          }

          // Reserve the credit by updating the balance
          await tx.organization.update({
            where: { id: organization.id },
            data: { creditBalance: org.creditBalance - 1 }
          });

          // Log credit usage
          await tx.creditUsage.create({
            data: {
              organizationId: organization.id,
              amount: -1,
              description: 'Webhook processed',
              webhookLogId: webhookLog.id
            }
          });
        });
      } catch (error) {
        // Update webhook log to blocked status
        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: {
            status: 'blocked',
            responseBody: { 
              error: 'Insufficient credits',
              details: 'Please purchase more credits to continue sending messages'
            } as Prisma.JsonObject
          }
        });

        return NextResponse.json({ 
          error: 'Insufficient credits',
          details: 'Please purchase more credits to continue sending messages'
        }, { status: 402 });
      }
    }

    // Validate webhook data
    if (!validationResult.success) {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: 'error',
          responseBody: { 
            error: 'Invalid webhook data',
            details: JSON.stringify(validationResult.error.errors)
          } as Prisma.JsonObject
        }
      });

      log('error', 'Invalid webhook data', { errors: validationResult.error.errors });
      return NextResponse.json(
        { error: 'Invalid webhook data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Register webhook fields
    await registerWebhookFields(validationResult.data);

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
      // Try to parse the URL to see if it's valid
      const urlObj = new URL(outboundWebhookUrl);
      log('info', 'Parsed webhook URL', { 
        original: outboundWebhookUrl,
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        pathname: urlObj.pathname
      });
    } catch (e) {
      // If URL parsing fails, assume it's a relative URL and prepend base URL
      validatedWebhookUrl = `https://app.messagelm.com${outboundWebhookUrl.startsWith('/') ? '' : '/'}${outboundWebhookUrl}`;
      log('info', 'Fixed relative webhook URL', { 
        original: outboundWebhookUrl,
        fixed: validatedWebhookUrl
      });
    }

    // Process webhook asynchronously
    processWebhookAsync(webhookLog, data, organization, outboundWebhookUrl, validatedWebhookUrl).catch(error => {
      log('error', 'Async processing error:', {
        error: error instanceof Error ? error.message : String(error),
        webhookLogId: webhookLog.id
      });
    });

    // Return immediate success response
    return NextResponse.json({ 
      status: 'success',
      message: 'Webhook received and queued for processing',
      webhookId: webhookLog.id
    });
  } catch (error) {
    log('error', 'Error processing webhook', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
} 
