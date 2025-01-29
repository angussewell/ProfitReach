import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Webhook data validation schema
const webhookSchema = z.object({
  accountId: z.string().optional(),
  scenarioName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactName: z.string().optional(),
  company: z.string().optional()
}).passthrough(); // Allow additional fields

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

    // Get the most recent GHL integration
    const ghlIntegration = organization.ghlIntegrations[0];
    if (!ghlIntegration) {
      console.warn('No GHL integration found for organization:', organization.id);
    }

    // Create webhook log
    const webhookLog = await prisma.webhookLog.create({
      data: {
        accountId: webhookData.accountId || 'unknown',
        organizationId: organization.id,
        status: 'received',
        scenarioName: webhookData.scenarioName || 'Unknown',
        contactEmail: webhookData.contactEmail || 'Unknown',
        contactName: webhookData.contactName || 'Unknown',
        company: webhookData.company || 'Unknown',
        requestBody: webhookData,
        ghlIntegrationId: ghlIntegration?.id || ''
      }
    });

    console.log('Webhook log created:', {
      webhookLogId: webhookLog.id,
      organizationId: organization.id,
      status: 'received'
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Webhook received and processed',
      webhookLogId: webhookLog.id
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
