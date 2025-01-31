import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { registerWebhookFields } from '@/lib/webhook-fields';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Webhook data validation schema for a single contact
const contactSchema = z.object({
  'Current Scenario': z.string().optional(),
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

// Accept either a single contact object or an array of contacts
const webhookSchema = z.union([
  contactSchema,
  z.array(contactSchema)
]);

export async function POST(
  request: Request,
  { params }: { params: { webhookUrl: string } }
) {
  try {
    // Validate webhook URL format
    if (!params.webhookUrl || params.webhookUrl.length < 32) {
      console.error('Invalid webhook URL format:', params.webhookUrl);
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
      console.error('Organization not found for webhook URL:', params.webhookUrl);
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 404 }
      );
    }

    // Parse and validate webhook data
    const rawData = await request.json();
    const validationResult = webhookSchema.safeParse(rawData);

    if (!validationResult.success) {
      console.error('Invalid webhook data:', validationResult.error);
      return NextResponse.json(
        { error: 'Invalid webhook data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Convert single object to array if needed
    const webhookData = Array.isArray(validationResult.data) 
      ? validationResult.data 
      : [validationResult.data];
    
    // Register all fields for future use
    await registerWebhookFields(webhookData[0]);

    // Get the most recent GHL integration
    const ghlIntegration = organization.ghlIntegrations[0];
    if (!ghlIntegration) {
      console.warn('No GHL integration found for organization:', organization.id);
    }

    // Process each contact in the array
    const results = await Promise.all(webhookData.map(async (contact) => {
      const scenarioName = contact['Current Scenario'] || 'Unknown';
      const isPositiveReply = contact.customData?.type === 'positive_reply' || 
                             contact.customData?.replyType === 'positive';

      // Create webhook log with initial status
      const webhookLog = await prisma.webhookLog.create({
        data: {
          accountId: contact.contact_id || 'unknown',
          organizationId: organization.id,
          status: 'received',
          scenarioName,
          contactEmail: contact.email || 'Unknown',
          contactName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown',
          company: contact.company_name || 'Unknown',
          requestBody: contact as unknown as Prisma.JsonObject,
          ...(ghlIntegration && { ghlIntegrationId: ghlIntegration.id })
        }
      });

      // Check if webhook URL is provided
      if (!contact.customData?.webhookURL) {
        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: { status: 'blocked', responseBody: { error: 'No webhook URL provided' } }
        });
        return webhookLog;
      }

      // Send outbound webhook
      try {
        const outboundResponse = await fetch(contact.customData.webhookURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact)
        });

        if (!outboundResponse.ok) {
          await prisma.webhookLog.update({
            where: { id: webhookLog.id },
            data: { 
              status: 'error',
              responseBody: { 
                error: `Outbound webhook failed with status ${outboundResponse.status}`,
                response: await outboundResponse.text()
              }
            }
          });
          return webhookLog;
        }

        // Update to success status
        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: { 
            status: 'success',
            responseBody: { response: await outboundResponse.json() }
          }
        });
        
      } catch (error) {
        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: { 
            status: 'error',
            responseBody: { error: error instanceof Error ? error.message : 'Unknown error' }
          }
        });
      }

      return webhookLog;
    }));

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Webhook received and processed',
      logs: results
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
