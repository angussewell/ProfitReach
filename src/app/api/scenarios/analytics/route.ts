import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface WebhookLog {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ScenarioWithLogs {
  id: string;
  name: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  webhookLogs: WebhookLog[];
}

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get date range from query parameters
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Fetch scenarios
    const scenarios = await prisma.scenario.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
    });

    // Fetch webhook logs with date filter and status 'success'
    const webhookLogs = await prisma.webhookLog.findMany({
      where: {
        organizationId: session.user.organizationId,
        status: 'success', // Only get successful webhooks
        ...(from && to ? {
          createdAt: {
            gte: new Date(from),
            lte: new Date(to),
          },
        } : {}),
      },
    });

    // Calculate analytics for each scenario
    const analytics = scenarios.map((scenario) => {
      const logs = webhookLogs.filter(log => log.scenarioName === scenario.name);
      return {
        id: scenario.id,
        name: scenario.name,
        totalContacts: logs.length, // This now only includes successful contacts
        activeContacts: logs.filter(log => log.status === 'active').length,
        responseCount: logs.filter(log => log.status === 'responded').length,
        createdAt: scenario.createdAt,
        updatedAt: scenario.updatedAt,
      };
    });

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching scenario analytics:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 