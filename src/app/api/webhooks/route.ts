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
      include: { ghlIntegration: true }
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
        payload: body,
      }
    });

    // Update metrics
    if (status === 'enrollment') {
      await prisma.metric.create({
        data: {
          organizationId,
          type: 'enrollment',
          scenarioName,
          contactEmail
        }
      });
    } else if (status === 'reply') {
      await prisma.metric.create({
        data: {
          organizationId,
          type: 'reply',
          scenarioName,
          contactEmail
        }
      });
    }

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 