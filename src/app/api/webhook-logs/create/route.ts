import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logging';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      organizationId,
      accountId = 'unknown',
      scenarioName = 'unknown',
      contactEmail = 'unknown',
      contactName = 'unknown',
      company = 'unknown',
      requestBody,
      emailSubject,
      emailHtmlBody
    } = data;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Create webhook log
    const webhookLog = await prisma.webhookLog.create({
      data: {
        accountId,
        organizationId,
        scenarioName,
        contactEmail,
        contactName,
        company,
        requestBody: requestBody || {},
        status: 'success',
        responseBody: { status: 'success' },
        ...(emailSubject && { emailSubject }),
        ...(emailHtmlBody && { emailHtmlBody })
      }
    });

    log('info', 'Created webhook log', {
      webhookLogId: webhookLog.id,
      organizationId,
      scenarioName,
      hasEmailContent: !!emailSubject || !!emailHtmlBody
    });

    return NextResponse.json(webhookLog);

  } catch (error) {
    log('error', 'Error creating webhook log:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: 'Failed to create webhook log' },
      { status: 500 }
    );
  }
} 