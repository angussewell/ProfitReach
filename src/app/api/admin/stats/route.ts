import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Import Prisma for types

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Overall stats
interface AdminStatsResponse {
  contactsEnrolled: number;
  avgReplyRate: number;
  meetingsBooked: number;
  activeScenarios: number;
  emailsSent: number; // Added
  responseNeededCount: number; // Added for Response Needed Emails
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
    emailsSent: number; // Added
    responseNeededCount: number; // Added for Response Needed Emails
  };
}

// Combined response structure
// Note: CombinedStatsResponse implicitly includes emailsSent via the nested types
interface CombinedStatsResponse {
  overall: AdminStatsResponse;
  organizations: PerOrgStats[];
}

// Type for the raw query result for grouped emails sent
interface GroupedEmailsSentResult {
  organizationId: string;
  count: bigint; // Prisma returns BigInt for COUNT(*)
}

// Type for the raw query result for grouped response needed emails
interface GroupedResponseNeededResult {
  organizationId: string;
  count: bigint; // Prisma returns BigInt for COUNT(*)
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
    const startDate = fromParam ? new Date(fromParam) : null;
    const endDate = toParam ? new Date(toParam) : null;

    // Prisma date filter object (used for non-raw queries)
    let dateFilterPrisma: { createdAt?: { gte: Date; lte: Date } } = {};
    if (startDate && endDate) {
      dateFilterPrisma = { createdAt: { gte: startDate, lte: endDate } };
    }
    console.log('[Admin Stats] Using Prisma date filter:', dateFilterPrisma);

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
        ...dateFilterPrisma,
        organizationId: { in: visibleOrgIds }
      },
    });
    const overallTotalResponses = await prisma.scenarioResponse.count({
      where: {
        ...dateFilterPrisma,
        Scenario: {
          organizationId: { in: visibleOrgIds }
        }
      },
    });
    const overallTotalWebhooks = overallContactsEnrolled > 0 ? overallContactsEnrolled : 1;
    const overallAvgReplyRate = (overallTotalResponses / overallTotalWebhooks) * 100;

    const overallActiveScenarios = await prisma.scenario.count({
      where: {
        status: 'active',
        ...dateFilterPrisma,
        organizationId: { in: visibleOrgIds }
      },
    });

    const overallMeetingsBooked = await prisma.appointment.count({
      where: {
        ...dateFilterPrisma,
        organizationId: { in: visibleOrgIds }
      },
    });

    // --- NEW: Calculate overall Emails Sent using $queryRaw ---
    let overallEmailsSent = 0;
    if (visibleOrgIds.length > 0) {
      // Build the raw query parts conditionally
      const conditions = [
        Prisma.sql`direction = 'outbound'`,
        Prisma.sql`"organizationId" = ANY(${visibleOrgIds})`
      ];
      if (startDate) {
        conditions.push(Prisma.sql`"createdAt" >= ${startDate}`);
      }
      if (endDate) {
        conditions.push(Prisma.sql`"createdAt" <= ${endDate}`);
      }

      const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
      const query = Prisma.sql`SELECT COUNT(*) as count FROM "MailReefMessage" ${whereClause}`;

      console.log('[Admin Stats] Running raw query for overall emails sent:', query);
      const result: { count: bigint }[] = await prisma.$queryRaw(query);
      overallEmailsSent = result.length > 0 ? Number(result[0].count) : 0;
    }
    console.log('[Admin Stats] Overall Emails Sent (Raw):', overallEmailsSent);
    // --- End NEW ---

    // --- Calculate overall Response Needed Emails using $queryRaw ---
    let overallResponseNeededCount = 0;
    if (visibleOrgIds.length > 0) {
      const conditions = [
        Prisma.sql`status = 'FOLLOW_UP_NEEDED'`,
        Prisma.sql`"organizationId" = ANY(${visibleOrgIds})`,
        Prisma.sql`"receivedAt" IS NOT NULL` // Ensure receivedAt is not null
      ];
      if (startDate) {
        // Use receivedAt for date filtering
        conditions.push(Prisma.sql`"receivedAt" >= ${startDate}`);
      }
      if (endDate) {
        // Use receivedAt for date filtering
        conditions.push(Prisma.sql`"receivedAt" <= ${endDate}`);
      }

      const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
      // Query the EmailMessage table
      const query = Prisma.sql`SELECT COUNT(*) as count FROM "EmailMessage" ${whereClause}`;

      console.log('[Admin Stats] Running raw query for overall response needed count:', query);
      const result: { count: bigint }[] = await prisma.$queryRaw(query); // Use $queryRaw for parameterized queries
      overallResponseNeededCount = result.length > 0 ? Number(result[0].count) : 0;
    }
    console.log('[Admin Stats] Overall Response Needed Count (Raw):', overallResponseNeededCount);
    // --- End Response Needed ---


    const overallStats: AdminStatsResponse = {
      contactsEnrolled: overallContactsEnrolled,
      avgReplyRate: parseFloat(overallAvgReplyRate.toFixed(1)),
      meetingsBooked: overallMeetingsBooked,
      activeScenarios: overallActiveScenarios,
      emailsSent: overallEmailsSent,
      responseNeededCount: overallResponseNeededCount, // Assign calculated value
    };

    // === Calculate Per-Organization Stats ===

    // 1. Get only VISIBLE organizations (Names needed for mapping later)
    const organizations = await prisma.organization.findMany({
      where: { id: { in: visibleOrgIds } },
      select: { id: true, name: true },
    });

    // 2. Group Webhook Logs by Org (Filter included)
    const groupedWebhookLogs = await prisma.webhookLog.groupBy({
      by: ['organizationId'],
      _count: { id: true },
      where: {
        status: 'success',
        ...dateFilterPrisma,
        organizationId: { in: visibleOrgIds }
      },
    });

    // 3. Fetch Scenario Responses for VISIBLE orgs within date range
    const allResponses = await prisma.scenarioResponse.findMany({
      where: {
        ...dateFilterPrisma,
        Scenario: {
          organizationId: { in: visibleOrgIds }
        }
      },
      include: {
        Scenario: {
          select: { organizationId: true },
        },
      }
    });

    // 3b. Group Scenario Responses manually in code
    const groupedResponsesManual = allResponses.reduce((acc, response) => {
      const orgId = response.Scenario?.organizationId;
      if (orgId) {
        acc[orgId] = (acc[orgId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // 4. Group Appointments by Org (Filter included)
    const groupedAppointments = await prisma.appointment.groupBy({
        by: ['organizationId'],
        _count: { id: true },
        where: {
          ...dateFilterPrisma,
          organizationId: { in: visibleOrgIds }
        },
    });

    // 5. Group Active Scenarios by Org (Filter included)
    const groupedActiveScenarios = await prisma.scenario.groupBy({
        by: ['organizationId'],
        _count: { id: true },
        where: {
          status: 'active',
          organizationId: { in: visibleOrgIds }
          // Note: Prisma groupBy doesn't directly support date filtering on the base model easily here
          // If date filtering is needed for active scenarios, it might require a different approach
        },
    });

    // --- NEW: 5b. Group Emails Sent by Org using $queryRaw ---
    let groupedEmailsSent: GroupedEmailsSentResult[] = [];
    if (visibleOrgIds.length > 0) {
      const conditions = [
        Prisma.sql`direction = 'outbound'`,
        Prisma.sql`"organizationId" = ANY(${visibleOrgIds})`
      ];
      if (startDate) {
        conditions.push(Prisma.sql`"createdAt" >= ${startDate}`);
      }
      if (endDate) {
        conditions.push(Prisma.sql`"createdAt" <= ${endDate}`);
      }

      const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
      const query = Prisma.sql`SELECT "organizationId", COUNT(*) as count FROM "MailReefMessage" ${whereClause} GROUP BY "organizationId"`;

      console.log('[Admin Stats] Running raw query for grouped emails sent:', query);
      groupedEmailsSent = await prisma.$queryRaw<GroupedEmailsSentResult[]>(query);
    }
    console.log('[Admin Stats] Grouped Emails Sent (Raw):', groupedEmailsSent);

    // Convert grouped raw results to a map for easier lookup
    const emailsSentMap = groupedEmailsSent.reduce((acc, item) => {
      acc[item.organizationId] = Number(item.count);
      return acc;
    }, {} as Record<string, number>);
    // --- End NEW ---

    // --- 5c. Group Response Needed Emails by Org using $queryRaw ---
    let groupedResponseNeeded: GroupedResponseNeededResult[] = [];
    if (visibleOrgIds.length > 0) {
      const conditions = [
        Prisma.sql`status = 'FOLLOW_UP_NEEDED'`,
        Prisma.sql`"organizationId" = ANY(${visibleOrgIds})`,
        Prisma.sql`"receivedAt" IS NOT NULL`
      ];
      if (startDate) {
        conditions.push(Prisma.sql`"receivedAt" >= ${startDate}`);
      }
      if (endDate) {
        conditions.push(Prisma.sql`"receivedAt" <= ${endDate}`);
      }

      const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
      const query = Prisma.sql`SELECT "organizationId", COUNT(*) as count FROM "EmailMessage" ${whereClause} GROUP BY "organizationId"`;

      console.log('[Admin Stats] Running raw query for grouped response needed count:', query);
      groupedResponseNeeded = await prisma.$queryRaw<GroupedResponseNeededResult[]>(query);
    }
    console.log('[Admin Stats] Grouped Response Needed Count (Raw):', groupedResponseNeeded);

    // Convert grouped raw results to a map for easier lookup
    const responseNeededMap = groupedResponseNeeded.reduce((acc, item) => {
      acc[item.organizationId] = Number(item.count);
      return acc;
    }, {} as Record<string, number>);
    // --- End Response Needed Grouping ---


    // 6. Combine data for each organization
    const organizationStats: PerOrgStats[] = organizations.map((org) => {
      const orgWebhookLogs = groupedWebhookLogs.find(g => g.organizationId === org.id)?._count.id || 0;
      const orgResponses = groupedResponsesManual[org.id] || 0;
      const orgAppointments = groupedAppointments.find(g => g.organizationId === org.id)?._count.id || 0;
      const orgActiveScenarios = groupedActiveScenarios.find(g => g.organizationId === org.id)?._count.id || 0;
      const orgEmailsSent = emailsSentMap[org.id] || 0; // Use the map from raw query
      const orgResponseNeededCount = responseNeededMap[org.id] || 0; // Use the map from raw query

      const orgTotalWebhooks = orgWebhookLogs > 0 ? orgWebhookLogs : 1;
      const orgReplyRate = parseFloat(((orgResponses / orgTotalWebhooks) * 100).toFixed(1));

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
          emailsSent: orgEmailsSent,
          responseNeededCount: orgResponseNeededCount, // Added
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
    console.error("!!! API Error fetching admin stats:", error);
    // Provide more detail in the error response if possible
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), {
       status: 500,
       headers: { 'Content-Type': 'application/json' }
    });
  }
}
