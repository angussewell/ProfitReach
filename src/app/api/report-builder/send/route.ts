import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { SendReportRequest, WebhookPayload } from '@/types/report-builder';

export const dynamic = 'force-dynamic';

interface ContactForWebhook {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  currentCompanyName: string | null;
  fullName: string | null;
  title: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phoneNumbers: any;
  additionalData: any;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: SendReportRequest = await req.json();
    
    if (!data.reportConfigId || !data.contactId || data.customNotes === undefined) {
      return NextResponse.json(
        { error: 'Report config ID, contact ID, and custom notes are required' },
        { status: 400 }
      );
    }

    // Fetch the report configuration using Prisma Client
    const reportConfig = await prisma.reportBuilderConfig.findFirst({
      where: {
        id: data.reportConfigId,
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        notificationEmail: true,
        organizationId: true,
      },
    });

    if (!reportConfig) {
      return NextResponse.json(
        { error: 'Report configuration not found' },
        { status: 404 }
      );
    }

    // Fetch the contact using Prisma Client
    const contact = await prisma.contacts.findFirst({
      where: {
        id: data.contactId,
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        currentCompanyName: true,
        fullName: true,
        title: true,
        city: true,
        state: true,
        country: true,
        phoneNumbers: true,
        additionalData: true,
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Create a report history record with PENDING status
    const historyRecord = await prisma.reportHistory.create({
      data: {
        reportBuilderConfigId: reportConfig.id,
        contactId: contact.id,
        userId: session.user.id,
        status: 'PENDING',
        customNotes: data.customNotes,
      },
    });

    // Build the webhook payload
    const payload: WebhookPayload = {
      reportConfigId: data.reportConfigId,
      organizationId: session.user.organizationId,
      userId: session.user.id,
      customNotes: data.customNotes,
      contact: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        currentCompanyName: contact.currentCompanyName,
        fullName: contact.fullName,
        title: contact.title,
        city: contact.city,
        state: contact.state,
        country: contact.country,
        phoneNumbers: contact.phoneNumbers,
        additionalData: contact.additionalData,
      },
      timestamp: new Date().toISOString(),
    };

    // Send the webhook (no status tracking - external system handles updates)
    try {
      console.log(`Sending webhook to: ${reportConfig.webhookUrl}`);
      console.log('Webhook payload:', JSON.stringify(payload, null, 2));

      const webhookResponse = await fetch(reportConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ProfitReach-ReportBuilder/1.0',
        },
        body: JSON.stringify(payload),
        // 30 second timeout
        signal: AbortSignal.timeout(30000),
      });

      const responseText = await webhookResponse.text();
      
      console.log(`Webhook response status: ${webhookResponse.status}`);
      console.log(`Webhook response: ${responseText}`);

      console.log(`Successfully dispatched report for contact ${contact.email} to ${reportConfig.webhookUrl}`);

      return NextResponse.json({
        success: true,
        message: 'Report dispatched successfully - processing will continue asynchronously',
        historyId: historyRecord.id,
      });

    } catch (webhookError) {
      console.error('Webhook sending error:', webhookError);
      
      // Handle different types of errors
      let errorMessage = 'Failed to send webhook request';
      
      if (webhookError instanceof Error) {
        if (webhookError.name === 'AbortError') {
          errorMessage = 'Webhook request timed out (30 seconds)';
        } else if (webhookError.message.includes('fetch')) {
          errorMessage = 'Network error while sending webhook';
        } else {
          errorMessage = webhookError.message;
        }
      }

      return NextResponse.json({
        success: false,
        message: errorMessage,
        historyId: historyRecord.id,
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in webhook send endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}