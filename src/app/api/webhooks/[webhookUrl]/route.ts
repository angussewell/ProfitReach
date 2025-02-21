import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { log } from '@/lib/logging';
import { Prisma } from '@prisma/client';
import process from 'process';

// Production N8N webhook URL should be: https://messagelm.app.n8n.cloud/webhook/webhook-process
const EXPECTED_N8N_WEBHOOK_URL = 'https://messagelm.app.n8n.cloud/webhook/webhook-process';

export const dynamic = 'force-dynamic';

// Simplified webhook schema - only validate essential fields
const webhookSchema = z.object({
  contact_id: z.string().optional(),
  'Current Scenario ': z.string().optional(),
  'Current Scenario': z.string().optional(),
  make_sequence: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  company_name: z.string().optional(),
}).passthrough();

// Webhook processing states
const WEBHOOK_STATES = {
  RECEIVED: 'received',
  QUEUED: 'queued',
  ERROR: 'error'
} as const;

export async function POST(
  request: Request,
  { params }: { params: { webhookUrl: string } }
) {
  try {
    // 1. Basic validation of webhook URL
    if (!params.webhookUrl || params.webhookUrl.length < 32) {
      log('error', 'Invalid webhook URL format', { webhookUrl: params.webhookUrl });
      return NextResponse.json(
        { error: 'Invalid webhook URL format' },
        { status: 400 }
      );
    }

    // 2. Parse and validate incoming data
    const clonedRequest = request.clone();
    const rawData = await clonedRequest.json();
    const validationResult = webhookSchema.safeParse(rawData);
    const data = validationResult.success ? validationResult.data : rawData;

    // 3. Get organization data
    const organization = await prisma.organization.findUnique({
      where: { webhookUrl: params.webhookUrl },
      select: {
        id: true,
        outboundWebhookUrl: true,
        ghlIntegrations: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { id: true }
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

    // 4. Create webhook log entry
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
        ...(organization.ghlIntegrations[0]?.id && { 
          ghlIntegrationId: organization.ghlIntegrations[0].id 
        })
      }
    });

    // 5. Queue webhook to N8N for processing
    try {
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
      if (!n8nWebhookUrl) {
        log('error', 'N8N webhook URL not configured', { 
          expected: EXPECTED_N8N_WEBHOOK_URL 
        });
        throw new Error('N8N webhook URL not configured - should be set to production URL');
      }

      if (n8nWebhookUrl !== EXPECTED_N8N_WEBHOOK_URL) {
        log('warn', 'N8N webhook URL does not match expected production URL', {
          current: n8nWebhookUrl,
          expected: EXPECTED_N8N_WEBHOOK_URL
        });
      }

      // Send to N8N queue with minimal required data
      const queueResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MessageLM-API'
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

// Add PATCH endpoint for N8N to update webhook status
export async function PATCH(
  request: Request,
  { params }: { params: { webhookUrl: string } }
) {
  try {
    const data = await request.json();
    const { status, responseBody } = data;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    await prisma.webhookLog.update({
      where: { id: params.webhookUrl }, // webhookUrl here is actually the webhookLogId
      data: {
        status,
        responseBody: responseBody as Prisma.JsonObject
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log('error', 'Failed to update webhook status', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
} 
