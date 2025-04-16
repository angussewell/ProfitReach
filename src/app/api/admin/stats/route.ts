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

    console.log(`[Admin Stats] Received date range: from=${fromParam}, to=${toParam}`);

    // Set up date filters if provided
    let dateFilter: { createdAt?: { gte: Date; lte: Date } } = {};
    if (fromParam && toParam) {
      dateFilter = { createdAt: { gte: new Date(fromParam), lte: new Date(toParam) } };
    }
    console.log('[Admin Stats] Using date filter:', dateFilter);
    
    // Fetch visible organization IDs first
    const visibleOrganizations = await prisma.organization.findMany({
      where: { hideFromAdminStats: false }, 
      select: { id: true },
    });
    const visibleOrgIds = visibleOrganizations.map(o => o.id);

    // === Calculate Overall Stats (Filtered) ===
    const overallContactsEnrolled = await prisma.webhookLog.count({
      where: { 
        status: 'success', 
        ...dateFilter,
        // Re-apply filter
        organizationId: { in: visibleOrgIds } 
      },
    });
    const overallTotalResponses = await prisma.scenarioResponse.count({
      where: {
        ...dateFilter,
        // Re-apply filter via nested relation
        Scenario: {
          organizationId: { in: visibleOrgIds }
        }
      },
    });
    const overallTotalWebhooks = overallContactsEnrolled > 0 ? overallContactsEnrolled : 1;
    const overallAvgReplyRate = (overallTotalResponses / overallTotalWebhooks) * 100;
    // overallMeetingsBooked is calculated later with the correct filter
    
    // Corrected: Calculate overallActiveScenarios ONCE 
    // Temporarily remove filter due to TS error - This was the corrected one, re-applying filter
    const overallActiveScenarios = await prisma.scenario.count({
      where: { 
        status: 'active', 
        ...dateFilter,
        organizationId: { in: visibleOrgIds } 
      },
    });
    
    // Calculate overallMeetingsBooked with correct filter (already using visibleOrgIds)
    const overallMeetingsBooked = await prisma.appointment.count({
      where: { 
        ...dateFilter,
        organizationId: { in: visibleOrgIds } // Correct filter using IDs
      },
    });

    const overallStats: AdminStatsResponse = {
      contactsEnrolled: overallContactsEnrolled,
      avgReplyRate: parseFloat(overallAvgReplyRate.toFixed(1)),
      meetingsBooked: overallMeetingsBooked, // Use the correctly filtered count
      activeScenarios: overallActiveScenarios,
    };

    // === Calculate Per-Organization Stats ===
    
    // 1. Get only VISIBLE organizations (Names needed for mapping later)
    // Re-apply filter
    const organizations = await prisma.organization.findMany({
      where: { id: { in: visibleOrgIds } }, 
      select: { id: true, name: true },
    });
    
    // visibleOrgIds already defined above

    // 2. Group Webhook Logs by Org (Filter included) - Filter already correct
    const groupedWebhookLogs = await prisma.webhookLog.groupBy({
      by: ['organizationId'],
      _count: { id: true },
      where: { 
        status: 'success', 
        ...dateFilter,
        // Also filter the grouped data
        organizationId: { in: visibleOrgIds } // Use pre-fetched visible IDs
      },
    });

    // 3. Fetch Scenario Responses for VISIBLE orgs within date range
    const allResponses = await prisma.scenarioResponse.findMany({
      where: { 
        ...dateFilter,
         // Re-apply filter via nested relation
        Scenario: {
          organizationId: { in: visibleOrgIds }
        }
      },
      include: {
        Scenario: { // Include the Scenario relation to access organizationId
          select: { organizationId: true },
        },
      }
    });

    // 3b. Group Scenario Responses manually in code
    // Explicitly type 'response' to help TS understand the included relation
    const groupedResponsesManual = allResponses.reduce((acc, response: typeof allResponses[0]) => { 
      const orgId = response.Scenario?.organizationId; // Access included relation
      if (orgId) {
        acc[orgId] = (acc[orgId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>); // { orgId: count, ... }
    
    // 4. Group Appointments by Org (Filter included)
    const groupedAppointments = await prisma.appointment.groupBy({
        by: ['organizationId'],
        _count: { id: true },
        where: { 
          ...dateFilter,
          // Also filter the grouped data
          organizationId: { in: visibleOrgIds } // Use pre-fetched visible IDs
        },
    });

    // 5. Group Active Scenarios by Org (Filter included)
    const groupedActiveScenarios = await prisma.scenario.groupBy({
        by: ['organizationId'],
        _count: { id: true },
        where: { 
          status: 'active',
          // Also filter the grouped data
          organizationId: { in: visibleOrgIds } // Use pre-fetched visible IDs
        },
    });

    // 6. Combine data for each organization
    // Corrected variable name from 'organizations.map' if it was wrong previously
    const organizationStats: PerOrgStats[] = organizations.map((org: { id: string; name: string }) => { // Added type for 'org'
      const orgWebhookLogs = groupedWebhookLogs.find(g => g.organizationId === org.id)?._count.id || 0;
      // Use the manually grouped response count
      const orgResponses = groupedResponsesManual[org.id] || 0; 
      const orgAppointments = groupedAppointments.find(g => g.organizationId === org.id)?._count.id || 0;
      const orgActiveScenarios = groupedActiveScenarios.find(g => g.organizationId === org.id)?._count.id || 0;
      
      const orgTotalWebhooks = orgWebhookLogs > 0 ? orgWebhookLogs : 1;
      const orgReplyRate = parseFloat(((orgResponses / orgTotalWebhooks) * 100).toFixed(1));

      // New calculated fields
      const bookingRate = orgWebhookLogs > 0
        ? parseFloat(((orgAppointments / orgWebhookLogs) * 100).toFixed(1))
        : 0;
      const replyToBookingRate = orgResponses > 0
        ? parseFloat(((orgAppointments / orgResponses) * 100).toFixed(1))
        : 0;

      return {
        id: org.id,
        name: org.name,
        stats: {
          contactsEnrolled: orgWebhookLogs,
          totalResponses: orgResponses,
          replyRate: orgReplyRate,
          meetingsBooked: orgAppointments,
          activeScenarios: orgActiveScenarios,
          bookingRate,
          replyToBookingRate,
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
    // Updated error logging
    console.error("!!! API Error fetching admin stats:", error); 
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
