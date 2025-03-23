import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { subHours } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface Scenario {
  id: string;
  name: string;
  touchpointType: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

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

interface Appointment {
  id: string;
  organizationId: string;
  createdAt: Date;
}

interface ScenarioWithLogs {
  id: string;
  name: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  webhookLogs: WebhookLog[];
}

interface Analytics {
  id: string;
  name: string;
  touchpointType: string;
  totalContacts: number;
  activeContacts: number;
  responseCount: number;
  manualRepliesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: Request): Promise<NextResponse> {
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

    // Initialize variables to store results
    let scenarios: Scenario[] = [];
    let webhookLogs: WebhookLog[] = [];
    let scenarioResponses: ScenarioResponse[] = [];
    let appointments: Appointment[] = [];

    try {
      // Fetch scenarios (excluding research type)
      console.log('Fetching scenarios...');
      try {
        scenarios = await prisma.scenario.findMany({
          where: {
            organizationId: session.user.organizationId,
            NOT: {
              touchpointType: 'research'
            }
          },
        });
        console.log(`Successfully fetched ${scenarios.length} scenarios`);
      } catch (scenarioError) {
        console.error('Error fetching scenarios:', scenarioError);
        // Continue with empty scenarios array instead of failing
        scenarios = [];
      }

      // Fetch webhook logs with date filter and status 'success'
      console.log('Fetching webhook logs...');
      try {
        webhookLogs = await prisma.webhookLog.findMany({
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
        console.log(`Successfully fetched ${webhookLogs.length} webhook logs`);
      } catch (webhookError) {
        console.error('Error fetching webhook logs:', webhookError);
        // Continue with empty webhookLogs array instead of failing
        webhookLogs = [];
      }

      // Get responses from the ScenarioResponse table
      console.log('Fetching scenario responses...');
      try {
        // Try with the expected schema first
        scenarioResponses = await prisma.scenarioResponse.findMany({
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
        console.log(`Successfully fetched ${scenarioResponses.length} scenario responses`);
      } catch (responseError) {
        console.error('Error fetching scenario responses with relation:', responseError);
        
        // Fall back to a simpler query if the relation query fails
        try {
          // Get all scenario IDs first
          const scenarioIds = scenarios.map(s => s.id);
          
          // Then query responses directly by scenario IDs
          scenarioResponses = await prisma.scenarioResponse.findMany({
            where: {
              scenarioId: {
                in: scenarioIds
              },
              ...(from && to ? {
                createdAt: {
                  gte: new Date(from),
                  lte: new Date(to),
                },
              } : {})
            }
          });
          console.log(`Successfully fetched ${scenarioResponses.length} scenario responses with fallback method`);
        } catch (fallbackError) {
          console.error('Error fetching scenario responses with fallback method:', fallbackError);
          // Continue with empty scenarioResponses array
          scenarioResponses = [];
        }
      }

      // Get appointments count for the date range
      console.log('Fetching appointments...');
      try {
        appointments = await prisma.appointment.findMany({
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
        console.log(`Successfully fetched ${appointments.length} appointments`);
      } catch (appointmentError) {
        console.error('Error fetching appointments:', appointmentError);
        // Continue with empty appointments array
        appointments = [];
      }

      // Calculate analytics for each scenario
      console.log('Calculating analytics...');
      const analytics: Analytics[] = scenarios.map((scenario) => {
        try {
          const logs = webhookLogs.filter(log => log.scenarioName === scenario.name);
          const responses = scenarioResponses.filter((r) => r.scenarioId === scenario.id);
          const manualResponses = responses.filter((r) => r.source === 'manual');
          
          return {
            id: scenario.id,
            name: scenario.name,
            touchpointType: scenario.touchpointType || 'email', // Provide default if missing
            totalContacts: logs.length,
            activeContacts: logs.filter(log => log.status === 'active').length,
            responseCount: responses.length,
            manualRepliesCount: manualResponses.length,
            createdAt: scenario.createdAt,
            updatedAt: scenario.updatedAt,
          };
        } catch (analyticsError) {
          console.error(`Error calculating analytics for scenario ${scenario.id}:`, analyticsError);
          // Return a default object with zeros for this scenario
          return {
            id: scenario.id,
            name: scenario.name,
            touchpointType: scenario.touchpointType || 'email',
            totalContacts: 0,
            activeContacts: 0,
            responseCount: 0,
            manualRepliesCount: 0,
            createdAt: scenario.createdAt,
            updatedAt: scenario.updatedAt,
          };
        }
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
      // Return a more detailed error message
      if (dbError instanceof Prisma.PrismaClientKnownRequestError) {
        console.error(`Prisma error code: ${dbError.code}, message: ${dbError.message}`);
        if (dbError.meta) {
          console.error('Meta information:', dbError.meta);
        }
      }
      
      // Return a fallback response with empty data instead of an error
      return NextResponse.json({
        scenarios: [],
        appointmentsCount: 0,
        error: 'Database error occurred, showing fallback data',
      }, {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        }
      });
    }
  } catch (error) {
    console.error('Error fetching scenario analytics:', error);
    // Return a fallback response with empty data instead of an error
    return NextResponse.json({
      scenarios: [],
      appointmentsCount: 0,
      error: 'Internal server error occurred, showing fallback data',
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      }
    });
  }
}