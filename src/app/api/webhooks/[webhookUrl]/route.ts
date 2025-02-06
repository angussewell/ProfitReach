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

export const dynamic = 'force-dynamic';

// Webhook schema
const webhookSchema = z.object({
  'Current Scenario ': z.string().optional(),
  contact_id: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
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
    password: string;
    host: string;
    port: number;
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

    // Find organization by webhook URL
    const organization = await prisma.organization.findUnique({
      where: { webhookUrl: params.webhookUrl },
      include: {
        ghlIntegrations: {
          take: 1,
          orderBy: { createdAt: 'desc' }
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

    // Parse and validate webhook data
    const rawData = await request.json();
    const validationResult = webhookSchema.safeParse(rawData);

    if (!validationResult.success) {
      log('error', 'Invalid webhook data', { errors: validationResult.error.errors });
      return NextResponse.json(
        { error: 'Invalid webhook data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Register webhook fields
    const data = validationResult.data;
    await registerWebhookFields(data);

    // Get the most recent GHL integration
    const ghlIntegration = organization.ghlIntegrations[0];
    if (!ghlIntegration) {
      log('warn', 'No GHL integration found', { organizationId: organization.id });
    }

    // Create webhook log
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

    // Use the webhook URL from customData since we're keeping it simple
    const outboundWebhookUrl = data.customData?.webhookURL;
    
    if (!outboundWebhookUrl) {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { 
          status: 'error',
          responseBody: { error: 'No webhook URL provided in customData' } as Prisma.JsonObject
        }
      });
      return NextResponse.json({ 
        message: 'Fields registered but no webhook URL provided',
        fieldsRegistered: true
      });
    }

    // Process webhook
    try {
      // Find the scenario to check test mode
      const scenario = await prisma.scenario.findFirst({
        where: { 
          name: data['Current Scenario '] || '',
          organizationId: organization.id
        }
      });

      // Prepare outbound data - keeping it simple, just pass through the data
      const outboundData = {
        ...data,
        // If test mode is enabled, override email
        ...(scenario?.testMode && scenario?.testEmail && {
          email: scenario.testEmail,
          contact_id: ''
        })
      };

      const outboundResponse = await fetch(outboundWebhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ProfitReach-API'
        },
        body: JSON.stringify(outboundData)
      });

      // Get response text first for better error logging
      const responseText = await outboundResponse.text();
      log('info', 'Outbound webhook response', { 
        status: outboundResponse.status,
        response: responseText,
        url: outboundWebhookUrl
      });

      if (!outboundResponse.ok) {
        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: { 
            status: 'error',
            responseBody: { 
              error: `Outbound webhook failed with status ${outboundResponse.status}`,
              response: responseText,
              url: outboundWebhookUrl
            } as Prisma.JsonObject
          }
        });
        return NextResponse.json({ 
          message: 'Fields registered but outbound webhook failed',
          fieldsRegistered: true,
          error: responseText
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
