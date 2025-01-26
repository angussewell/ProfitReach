import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const locationId = request.headers.get('X-Location-Id');

    if (!locationId) {
      return NextResponse.json(
        { error: 'Missing location ID' },
        { status: 400 }
      );
    }

    // Find the GHL integration for this location
    const ghlIntegration = await prisma.gHLIntegration.findFirst({
      where: { locationId },
      include: { organization: true }
    });

    if (!ghlIntegration) {
      return NextResponse.json(
        { error: 'Unknown location ID' },
        { status: 404 }
      );
    }

    // Create webhook log
    const webhookLog = await prisma.webhookLog.create({
      data: {
        accountId: locationId,
        organizationId: ghlIntegration.organizationId,
        ghlIntegrationId: ghlIntegration.id,
        scenarioName: body.scenarioName || 'Unknown',
        contactEmail: body.contactEmail || 'Unknown',
        contactName: body.contactName || 'Unknown',
        company: body.company || 'Unknown',
        requestBody: body,
        status: 'success'
      }
    });

    // Update metrics
    if (body.type === 'enrollment') {
      await prisma.metric.upsert({
        where: {
          accountId_scenarioName: {
            accountId: locationId,
            scenarioName: body.scenarioName
          }
        },
        create: {
          accountId: locationId,
          organizationId: ghlIntegration.organizationId,
          scenarioName: body.scenarioName,
          enrollments: 1,
          replies: 0
        },
        update: {
          enrollments: {
            increment: 1
          }
        }
      });
    } else if (body.type === 'reply') {
      await prisma.metric.upsert({
        where: {
          accountId_scenarioName: {
            accountId: locationId,
            scenarioName: body.scenarioName
          }
        },
        create: {
          accountId: locationId,
          organizationId: ghlIntegration.organizationId,
          scenarioName: body.scenarioName,
          enrollments: 0,
          replies: 1
        },
        update: {
          replies: {
            increment: 1
          }
        }
      });
    }

    return NextResponse.json(webhookLog);
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 