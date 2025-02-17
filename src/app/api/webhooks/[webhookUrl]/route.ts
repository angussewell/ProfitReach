import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerWebhookFields } from '@/lib/webhook-fields';
import { z } from 'zod';
import { log } from '@/lib/logging';
import { Prisma } from '@prisma/client';
import { processWebhookVariables } from '@/utils/variableReplacer';
import { Filter } from '@/types/filters';
import { evaluateFilters } from '@/lib/filter-utils';
import { decrypt } from '@/lib/encryption';
import { hasValidPaymentMethod, updateCreditBalance, reportScenarioUsage } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

// Webhook schema
const webhookSchema = z.object({
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
  emailData?: {
    email: string;
    name: string;
    unipileAccountId: string;
  };
  socialData?: {
    name: string;
    accountId: string;
    provider: string;
  };
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
        }
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
        scenarioName: data['Current Scenario '] || 'unknown',
        contactEmail: data.email || 'Unknown',
        contactName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown',
        company: data.company_name || 'Unknown',
        requestBody: data as unknown as Prisma.JsonObject,
        responseBody: { status: 'received' } as Prisma.JsonObject,
        ...(ghlIntegration && { ghlIntegrationId: ghlIntegration.id })
      }
    });

    // Check payment method for at-cost plan
    if (organization.billingPlan === 'at_cost') {
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

      // Check credit balance
      if (organization.creditBalance < 1) {
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

    // Process webhook
    try {
      // Find the scenario to check test mode
      const scenario = await prisma.scenario.findFirst({
        where: { 
          name: data['Current Scenario '] || '',
          organizationId: organization.id
        },
        include: {
          snippet: true,
          attachment: true
        }
      });

      if (!scenario) {
        throw new Error('Scenario not found');
      }

      // Handle email account logic based on email sender
      let emailAccounts = null;
      let socialAccount = null;
      const emailSender = data['Email Sender'];
      
      if (emailSender) {
        emailAccounts = await prisma.emailAccount.findMany({
          where: {
            organizationId: organization.id,
            email: emailSender,
            isActive: true
          }
        });
      }

      // Find active LinkedIn account
      socialAccount = await prisma.socialAccount.findFirst({
        where: {
          organizationId: organization.id,
          provider: 'LINKEDIN',
          isActive: true
        }
      });

      log('info', 'Found accounts for webhook', { 
        emailAccountsCount: emailAccounts?.length || 0,
        hasLinkedInAccount: !!socialAccount
      });

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

      // Fetch and process prompts
      const prompts = await prisma.prompt.findMany({
        where: { organizationId: organization.id }
      });
      const processedPrompts = prompts.reduce((acc, prompt) => {
        acc[prompt.name] = processWebhookVariables(prompt.content, data);
        return acc;
      }, {} as Record<string, string>);

      // Prepare outbound data
      const outboundData: OutboundData = {
        contactData: {
          ...data,
          // If test mode is enabled, override email
          ...(scenario.testMode && scenario.testEmail && {
            email: scenario.testEmail,
            contact_id: ''
          })
        },
        scenarioData: processedScenario,
        prompts: processedPrompts,
        emailData: emailAccounts?.[0] ? {
          email: emailAccounts[0].email,
          name: emailAccounts[0].name,
          unipileAccountId: emailAccounts[0].unipileAccountId || ''
        } : undefined,
        socialData: socialAccount ? {
          name: socialAccount.name,
          accountId: socialAccount.username,
          provider: socialAccount.provider
        } : undefined
      };

      log('info', 'Sending outbound webhook request', {
        url: validatedWebhookUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ProfitReach-API'
        }
      });

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

      // Check if response looks like a sign-in page
      const isSignInPage = responseText.toLowerCase().includes('sign in') || 
                          responseText.toLowerCase().includes('login') ||
                          responseText.toLowerCase().includes('authentication required');

      if (!outboundResponse.ok) {
        const errorMessage = isSignInPage 
          ? 'Outbound webhook failed - received a sign-in page. Please check if the webhook URL is correct and accessible without authentication.'
          : `Outbound webhook failed with status ${outboundResponse.status}`;

        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: { 
            status: 'error',
            responseBody: { 
              error: errorMessage,
              response: responseText,
              url: validatedWebhookUrl
            } as Prisma.JsonObject
          }
        });
        return NextResponse.json({ 
          message: 'Fields registered but outbound webhook failed',
          fieldsRegistered: true,
          error: errorMessage
        });
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

      // Update to success status
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { 
          status: scenario?.testMode ? 'testing' : 'success',
          responseBody: typeof responseData === 'string' 
            ? { response: responseData } 
            : responseData as Prisma.JsonObject
        }
      });

      // If the webhook was successful and the organization is on the at_cost plan,
      // deduct a credit and report usage
      if (
        !scenario?.testMode &&
        organization.billingPlan === 'at_cost'
      ) {
        try {
          log('info', 'Processing credit deduction', {
            organizationId: organization.id,
            webhookLogId: webhookLog.id,
            currentBalance: organization.creditBalance,
            scenarioId: scenario.id,
            scenarioName: scenario.name
          });

          let newBalance;
          await prisma.$transaction(async (tx) => {
            newBalance = await updateCreditBalance(organization.id, -1, 'Webhook processed', webhookLog.id);
            await reportScenarioUsage(organization.id);
          });

          log('info', 'Credit deduction successful', {
            organizationId: organization.id,
            webhookLogId: webhookLog.id,
            deductedAmount: 1,
            previousBalance: organization.creditBalance,
            newBalance: newBalance,
            scenarioId: scenario.id,
            scenarioName: scenario.name
          });
        } catch (error) {
          // If there are insufficient credits or no active subscription,
          // update the webhook log status
          await prisma.webhookLog.update({
            where: { id: webhookLog.id },
            data: { status: 'blocked' },
          });

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          log('error', 'Error processing webhook credits:', {
            error: errorMessage,
            organizationId: organization.id,
            webhookLogId: webhookLog.id,
            currentBalance: organization.creditBalance,
            scenarioId: scenario?.id,
            scenarioName: scenario?.name
          });

          return NextResponse.json(
            { error: 'Insufficient credits or no active subscription' },
            { status: 402 }
          );
        }
      }

      return NextResponse.json({ 
        message: 'Webhook processed successfully',
        fieldsRegistered: true
      });
    } catch (error) {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { 
          status: 'error',
          responseBody: { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          } as Prisma.JsonObject
        }
      });
      return NextResponse.json({ 
        message: 'Fields registered but webhook processing failed',
        fieldsRegistered: true,
        error: error instanceof Error ? error.message : 'Unknown error'
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
