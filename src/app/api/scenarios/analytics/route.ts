import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { subHours } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface WebhookLog {
  id: string;
  scenarioName: string;
  status: string;
  createdAt: Date;
}

interface ScenarioResponse {
  id: string;
  scenarioId: string;
  source: string;
  threadId: string | null;
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

    // Validate date parameters
    if ((from && !Date.parse(from)) || (to && !Date.parse(to))) {
      return new NextResponse('Invalid date format', { status: 400 });
    }

    try {
      // Fetch scenarios (excluding research type)
      const scenarios = await prisma.scenario.findMany({
        where: {
          organizationId: session.user.organizationId,
          NOT: {
            touchpointType: 'research'
          }
        },
      });

      // Fetch webhook logs with date filter and status 'success'
      const webhookLogs = await prisma.webhookLog.findMany({
        where: {
          organizationId: session.user.organizationId,
          status: 'success',
          NOT: {
            scenarioName: {
              contains: 'research',
              mode: 'insensitive'
            }
          },
          ...(from && to ? {
            createdAt: {
              gte: new Date(from),
              lte: new Date(to),
            },
          } : {}),
        },
      });

      // Get responses from the ScenarioResponse table
      const scenarioResponses = await prisma.scenarioResponse.findMany({
        where: {
          scenario: {
            organizationId: session.user.organizationId
          },
          ...(from && to ? {
            createdAt: {
              gte: new Date(from),
              lte: new Date(to),
            },
          } : {})
        }
      });

      // Get appointments count for the date range
      const appointments = await prisma.appointment.findMany({
        where: {
          organizationId: session.user.organizationId,
          ...(from && to ? {
            createdAt: {
              gte: subHours(new Date(from), 4),
              lte: subHours(new Date(to), 4)
            },
          } : {}),
        },
      });

      // Calculate analytics for each scenario
      const analytics = scenarios.map((scenario) => {
        const logs = webhookLogs.filter(log => log.scenarioName === scenario.name);
        const responses = scenarioResponses.filter((r) => r.scenarioId === scenario.id);
        const manualResponses = responses.filter((r) => r.source === 'manual');
        
        return {
          id: scenario.id,
          name: scenario.name,
          touchpointType: scenario.touchpointType,
          totalContacts: logs.length,
          activeContacts: logs.filter(log => log.status === 'active').length,
          responseCount: responses.length,
          manualRepliesCount: manualResponses.length,
          createdAt: scenario.createdAt,
          updatedAt: scenario.updatedAt,
        };
      });

      return NextResponse.json({
        scenarios: analytics,
        appointmentsCount: appointments.length,
      }, {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return new NextResponse('Database error', { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching scenario analytics:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}