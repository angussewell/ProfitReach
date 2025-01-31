import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const organizationId = req.headers.get('x-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { ghlIntegrations: true }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await req.json();
    const { scenarioName, contactEmail, status } = body;

    // Create webhook log
    const log = await prisma.webhookLog.create({
      data: {
        organizationId,
        scenarioName,
        contactEmail,
        status,
        requestBody: body,
        responseBody: {},
        ghlIntegrationId: organization.ghlIntegrations[0]?.id || '',
        accountId: body.accountId || 'unknown',
        contactName: body.contactName || 'Unknown',
        company: body.company || 'Unknown'
      }
    });

    // Update metrics
    const existingMetric = await prisma.metric.findUnique({
      where: {
        accountId_scenarioName: {
          accountId: body.accountId || 'unknown',
          scenarioName
        }
      }
    });

    if (existingMetric) {
      await prisma.metric.update({
        where: {
          accountId_scenarioName: {
            accountId: body.accountId || 'unknown',
            scenarioName
          }
        },
        data: {
          enrollments: status === 'enrollment' ? existingMetric.enrollments + 1 : existingMetric.enrollments,
          replies: status === 'reply' ? existingMetric.replies + 1 : existingMetric.replies,
          updatedAt: new Date()
        }
      });
    } else {
      await prisma.metric.create({
        data: {
          organizationId,
          accountId: body.accountId || 'unknown',
          scenarioName,
          enrollments: status === 'enrollment' ? 1 : 0,
          replies: status === 'reply' ? 1 : 0,
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 