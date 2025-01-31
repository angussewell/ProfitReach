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

// Array of contacts schema
const webhookSchema = z.array(contactSchema);

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

    const webhookData = validationResult.data;
    
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

      // Create webhook log
      const webhookLog = await prisma.webhookLog.create({
        data: {
          accountId: contact.contact_id || 'unknown',
          organizationId: organization.id,
          status: isPositiveReply ? 'positive_reply' : 'received',
          scenarioName,
          contactEmail: contact.email || 'Unknown',
          contactName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown',
          company: contact.company_name || 'Unknown',
          requestBody: contact as unknown as Prisma.JsonObject,
          ghlIntegrationId: ghlIntegration?.id || ''
        }
      });

      // Update metrics for positive replies
      if (isPositiveReply) {
        await prisma.metric.upsert({
          where: {
            accountId_scenarioName: {
              accountId: contact.contact_id || 'unknown',
              scenarioName
            }
          },
          create: {
            accountId: contact.contact_id || 'unknown',
            organizationId: organization.id,
            scenarioName,
            enrollments: 0,
            replies: 1,
            updatedAt: new Date()
          },
          update: {
            replies: {
              increment: 1
            },
            updatedAt: new Date()
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
