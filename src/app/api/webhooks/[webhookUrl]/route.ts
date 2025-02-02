import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerWebhookFields } from '@/lib/webhook-fields';
import { z } from 'zod';
import { log } from '@/lib/logging';
import { Prisma } from '@prisma/client';
import { processWebhookVariables } from '@/utils/variableReplacer';

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

    // Process webhook if URL is provided
    if (data.customData?.webhookURL) {
      try {
        const scenario = await prisma.scenario.findFirst({
          where: { 
            name: data['Current Scenario '] || '',
            organizationId: organization.id
          },
          include: {
            signature: {
              select: {
                content: true
              }
            },
            snippet: {
              select: {
                content: true
              }
            },
            attachment: {
              select: {
                content: true
              }
            }
          }
        });

        if (!scenario) {
          await prisma.webhookLog.update({
            where: { id: webhookLog.id },
            data: { 
              status: 'error',
              responseBody: { error: 'Scenario not found' } as Prisma.JsonObject
            }
          });
          return NextResponse.json({ 
            message: 'Fields registered but scenario not found',
            fieldsRegistered: true
          });
        }

        // Send outbound webhook
        const outboundData = {
          contactData: data,
          scenarioData: {
            id: scenario.id,
            name: scenario.name,
            touchpointType: scenario.touchpointType,
            customizationPrompt: scenario.customizationPrompt ? processWebhookVariables(scenario.customizationPrompt, data) : null,
            emailExamplesPrompt: scenario.emailExamplesPrompt ? processWebhookVariables(scenario.emailExamplesPrompt, data) : null,
            subjectLine: scenario.subjectLine ? processWebhookVariables(scenario.subjectLine, data) : null,
            followUp: scenario.isFollowUp,
            attachment: scenario.attachment?.content ? processWebhookVariables(scenario.attachment.content, data) : null,
            snippet: scenario.snippet?.content ? processWebhookVariables(scenario.snippet.content, data) : null
          }
        };

        const outboundResponse = await fetch(data.customData.webhookURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(outboundData)
        });

        if (!outboundResponse.ok) {
          await prisma.webhookLog.update({
            where: { id: webhookLog.id },
            data: { 
              status: 'error',
              responseBody: { 
                error: `Outbound webhook failed with status ${outboundResponse.status}`,
                response: await outboundResponse.text()
              } as Prisma.JsonObject
            }
          });
          return NextResponse.json({ 
            message: 'Fields registered but outbound webhook failed',
            fieldsRegistered: true
          });
        }

        // Update to success status
        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: { 
            status: 'success',
            responseBody: { 
              response: await outboundResponse.json() 
            } as Prisma.JsonObject
          }
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
    }

    // Return success response
    return NextResponse.json({ 
      message: 'Webhook processed successfully',
      fieldsRegistered: true
    });

  } catch (error) {
    log('error', 'Error processing webhook', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
} 
