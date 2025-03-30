import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Overall stats
interface AdminStatsResponse {
  contactsEnrolled: number;
  avgReplyRate: number;
  meetingsBooked: number;
  activeScenarios: number;
}

// Per-organization stats structure
interface PerOrgStats {
  id: string;
  name: string;
  stats: {
    contactsEnrolled: number;
    totalResponses: number;
    replyRate: number;
    meetingsBooked: number;
    activeScenarios: number;
  };
}

// Combined response structure
interface CombinedStatsResponse {
  overall: AdminStatsResponse;
  organizations: PerOrgStats[];
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Verify admin access
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return new NextResponse('Unauthorized - Admin access required', { status: 403 });
    }

    // Get date range from query parameters
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // Validate date parameters
    if ((fromParam && !Date.parse(fromParam)) || (toParam && !Date.parse(toParam))) {
      return new NextResponse('Invalid date format', { status: 400 });
    }

    // Set up date filters if provided
    let dateFilter: { createdAt?: { gte: Date; lte: Date } } = {};
    if (fromParam && toParam) {
      dateFilter = { createdAt: { gte: new Date(fromParam), lte: new Date(toParam) } };
    }

    // === Calculate Overall Stats (Mostly Unchanged) ===
    const overallContactsEnrolled = await prisma.webhookLog.count({
      where: { status: 'success', ...dateFilter },
    });
    const overallTotalResponses = await prisma.scenarioResponse.count({
      where: dateFilter,
    });
    const overallTotalWebhooks = overallContactsEnrolled > 0 ? overallContactsEnrolled : 1;
    const overallAvgReplyRate = (overallTotalResponses / overallTotalWebhooks) * 100;
    const overallMeetingsBooked = await prisma.appointment.count({
      where: dateFilter,
    });
    const overallActiveScenarios = await prisma.scenario.count({
      where: { status: 'active', ...dateFilter },
    });

    const overallStats: AdminStatsResponse = {
      contactsEnrolled: overallContactsEnrolled,
      avgReplyRate: parseFloat(overallAvgReplyRate.toFixed(1)),
      meetingsBooked: overallMeetingsBooked,
      activeScenarios: overallActiveScenarios,
    };

    // === Calculate Per-Organization Stats ===
    
    // 1. Get all organizations
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true },
    });

    // 2. Group Webhook Logs by Org
    const groupedWebhookLogs = await prisma.webhookLog.groupBy({
      by: ['organizationId'],
      _count: { id: true },
      where: { status: 'success', ...dateFilter },
    });

    // 3. Fetch ALL Scenario Responses within date range and include Scenario for Org ID
    const allResponses = await prisma.scenarioResponse.findMany({
      where: dateFilter, 
      include: {
        scenario: {
          select: { organizationId: true }
        }
      }
    });

    // 3b. Group Scenario Responses manually in code
    const groupedResponsesManual = allResponses.reduce((acc, response) => {
      const orgId = response.scenario?.organizationId;
      if (orgId) { 
        acc[orgId] = (acc[orgId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>); // { orgId: count, ... }
    
    // 4. Group Appointments by Org
    const groupedAppointments = await prisma.appointment.groupBy({
        by: ['organizationId'],
        _count: { id: true },
        where: dateFilter,
    });

    // 5. Group Active Scenarios by Org
    const groupedActiveScenarios = await prisma.scenario.groupBy({
        by: ['organizationId'],
        _count: { id: true },
        where: { status: 'active' },
    });

    // 6. Combine data for each organization
    const organizationStats: PerOrgStats[] = organizations.map(org => {
      const orgWebhookLogs = groupedWebhookLogs.find(g => g.organizationId === org.id)?._count.id || 0;
      // Use the manually grouped response count
      const orgResponses = groupedResponsesManual[org.id] || 0; 
      const orgAppointments = groupedAppointments.find(g => g.organizationId === org.id)?._count.id || 0;
      const orgActiveScenarios = groupedActiveScenarios.find(g => g.organizationId === org.id)?._count.id || 0;
      
      const orgTotalWebhooks = orgWebhookLogs > 0 ? orgWebhookLogs : 1;
      const orgReplyRate = parseFloat(((orgResponses / orgTotalWebhooks) * 100).toFixed(1));

      return {
        id: org.id,
        name: org.name,
        stats: {
          contactsEnrolled: orgWebhookLogs,
          totalResponses: orgResponses,
          replyRate: orgReplyRate,
          meetingsBooked: orgAppointments,
          activeScenarios: orgActiveScenarios,
        },
      };
    });

    // === Create Combined Response ===
    const responseData: CombinedStatsResponse = {
      overall: overallStats,
      organizations: organizationStats,
    };

    // Return the combined stats
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in admin stats API:', error);
    if (error instanceof Error) {
        console.error(error.message);
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 