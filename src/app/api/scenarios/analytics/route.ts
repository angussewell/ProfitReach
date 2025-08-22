import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { subHours } from 'date-fns';
import { getAuth } from '@/lib/auth-simple';

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
    // Simple auth check
    const { session, error } = await getAuth();
    if (error) {
      return error;
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
    let appointments: Appointment[] = [];
    let manualRepliesMap: Record<string, number> = {};

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

      // Fetch manual replies from ScenarioResponse table
      console.log('Fetching manual replies...');
      try {
        if (scenarios.length > 0) {
          const scenarioIds = scenarios.map(s => s.id);
          const manualReplies = await prisma.scenarioResponse.findMany({
            where: {
              scenarioId: { in: scenarioIds },
              source: 'manual',
              ...(from && to ? {
                createdAt: {
                  gte: new Date(from),
                  lte: new Date(to),
                },
              } : {})
            },
            select: { scenarioId: true }
          });
          
          // Count manual replies per scenario
          manualRepliesMap = manualReplies.reduce((acc, reply) => {
            acc[reply.scenarioId] = (acc[reply.scenarioId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          console.log(`Successfully fetched ${manualReplies.length} manual replies`);
        }
      } catch (manualRepliesError) {
        console.error('Error fetching manual replies:', manualRepliesError);
        // Continue with empty manual replies
        manualRepliesMap = {};
      }

      // Get analytics from MailReefMessage table (the correct source of truth)
      console.log('Fetching scenario analytics from MailReefMessage...');
      
      // Initialize variables for storing aggregated results
      let scenarioContactCounts: Record<string, number> = {};
      let scenarioResponseCounts: Record<string, number> = {};
      
      try {
        if (scenarios.length > 0) {
          const scenarioIds = scenarios.map(s => s.id);
          
          // Build date filter conditions
          const conditions = [
            Prisma.sql`"organizationId" = ${session.user.organizationId}`,
            Prisma.sql`"scenarioId" = ANY(${scenarioIds})`
          ];
          
          if (from && to) {
            conditions.push(Prisma.sql`"eventTimestamp" >= ${new Date(from)}`);
            conditions.push(Prisma.sql`"eventTimestamp" <= ${new Date(to)}`);
          }
          
          // Query 1: Get total contacts (outbound messages) per scenario
          console.log('Querying outbound messages from MailReefMessage...');
          const outboundConditions = [...conditions, Prisma.sql`direction = 'outbound'`];
          const outboundWhereClause = Prisma.sql`WHERE ${Prisma.join(outboundConditions, ' AND ')}`;
          const outboundQuery = Prisma.sql`
            SELECT "scenarioId", COUNT(*) as count 
            FROM "MailReefMessage" 
            ${outboundWhereClause} 
            GROUP BY "scenarioId"
          `;
          
          const outboundResults: Array<{scenarioId: string, count: bigint}> = 
            await prisma.$queryRaw(outboundQuery);
          
          // Convert to lookup map
          scenarioContactCounts = outboundResults.reduce((acc, row) => {
            acc[row.scenarioId] = Number(row.count);
            return acc;
          }, {} as Record<string, number>);
          
          console.log(`Found contact counts for ${outboundResults.length} scenarios`);
          
          // Query 2: Get total responses (inbound messages) per scenario
          console.log('Querying inbound messages from MailReefMessage...');
          
          // TODO: Implement thread-based reply tracking once customThreadId field is available
          // For now, we'll count all inbound messages for this organization as a temporary measure
          const inboundConditions = [...conditions, Prisma.sql`direction = 'inbound'`];
          const inboundWhereClause = Prisma.sql`WHERE ${Prisma.join(inboundConditions, ' AND ')}`;
          const inboundQuery = Prisma.sql`
            SELECT "scenarioId", COUNT(*) as count 
            FROM "MailReefMessage" 
            ${inboundWhereClause} 
            GROUP BY "scenarioId"
          `;
          
          const inboundResults: Array<{scenarioId: string, count: bigint}> = 
            await prisma.$queryRaw(inboundQuery);
          
          // Convert to lookup map
          scenarioResponseCounts = inboundResults.reduce((acc, row) => {
            acc[row.scenarioId] = Number(row.count);
            return acc;
          }, {} as Record<string, number>);
          
          console.log(`Found response counts for ${inboundResults.length} scenarios`);
        }
      } catch (mailReefError) {
        console.error('Error fetching MailReef analytics:', mailReefError);
        // Continue with empty counts - scenarios will show 0 values
        scenarioContactCounts = {};
        scenarioResponseCounts = {};
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

      // Calculate analytics for each scenario using MailReefMessage data
      console.log('Calculating analytics using MailReefMessage data...');
      const analytics: Analytics[] = scenarios.map((scenario) => {
        try {
          // Get counts from the MailReefMessage aggregated data
          const totalContacts = scenarioContactCounts[scenario.id] || 0;
          const responseCount = scenarioResponseCounts[scenario.id] || 0;
          
          // For activeContacts, we'll use the same as totalContacts for now
          // (since MailReefMessage doesn't have an "active" status field)
          const activeContacts = totalContacts;
          
          // For manual replies count, use the pre-calculated map
          const manualRepliesCount = manualRepliesMap[scenario.id] || 0;
          
          return {
            id: scenario.id,
            name: scenario.name,
            touchpointType: scenario.touchpointType || 'email',
            totalContacts: totalContacts,
            activeContacts: activeContacts,
            responseCount: responseCount,
            manualRepliesCount: manualRepliesCount,
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
