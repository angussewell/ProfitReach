import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { formatDateInCentralTime } from '@/lib/date-utils';
import { WebhookLog, Prisma } from '@prisma/client'; // Import Prisma for sql template tag

export const dynamic = 'force-dynamic';

// Helper function to parse JSON safely
function safeJsonParse(value: any): any {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

// Type for our formatted response
interface FormattedWebhookLog extends Omit<WebhookLog, 'createdAt'> {
  createdAt: string;
  // company type is inherited from Omit<WebhookLog, ...> and will be string
  // due to COALESCE in the raw query. No need to redefine it here.
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const scenario = searchParams.get('scenario');
    const hasMessage = searchParams.get('hasMessage') === 'true' || searchParams.get('hasEmail') === 'true';

    const skip = (page - 1) * limit;

    // --- Build Raw SQL WHERE Clause ---
    let whereClauses: Prisma.Sql[] = [Prisma.sql`"organizationId" = ${session.user.organizationId}`];
    
    if (status && status !== 'all') {
      whereClauses.push(Prisma.sql`status = ${status}`);
    }
    
    if (scenario && scenario !== 'all') {
      whereClauses.push(Prisma.sql`"scenarioName" = ${scenario}`);
    }
    
    if (hasMessage) {
      // Note: Ensure column names match exactly (case-sensitive in PostgreSQL unless quoted)
      whereClauses.push(Prisma.sql`(("emailSubject" IS NOT NULL AND "emailSubject" != '') OR ("emailHtmlBody" IS NOT NULL AND "emailHtmlBody" != ''))`);
    }
    
    if (search) {
      const searchPattern = `%${search}%`;
      whereClauses.push(Prisma.sql`("contactEmail" ILIKE ${searchPattern} OR "contactName" ILIKE ${searchPattern} OR "scenarioName" ILIKE ${searchPattern})`);
    }

    const whereSql = Prisma.sql`WHERE ${Prisma.join(whereClauses, ' AND ')}`;
    // --- End Raw SQL WHERE Clause ---


    // --- Fetch logs with pagination using Raw SQL ---
    const logsQuery = Prisma.sql`
      SELECT 
        id, "accountId", "organizationId", "createdAt", status, "scenarioName", 
        "contactEmail", "contactName", COALESCE(company, 'Unknown') AS company, 
        "requestBody", "responseBody", "ghlIntegrationId", "updatedAt", 
        "emailSubject", "emailHtmlBody" 
      FROM "WebhookLog"
      ${whereSql}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;
    
    const countQuery = Prisma.sql`SELECT COUNT(*) FROM "WebhookLog" ${whereSql}`;

    // Execute raw queries
    const [logsResult, countResult] = await Promise.all([
      prisma.$queryRaw<WebhookLog[]>(logsQuery),
      prisma.$queryRaw<{ count: bigint }[]>(countQuery)
    ]);
    
    const total = Number(countResult[0]?.count ?? 0); // Extract count and convert from BigInt
    // --- End Raw SQL Fetch ---


    // Get unique scenarios for filtering (can likely remain as is)
    const scenarios = await prisma.webhookLog.findMany({
      where: {
        organizationId: session.user.organizationId
      },
      select: {
        scenarioName: true
      },
      distinct: ['scenarioName'],
      orderBy: {
        scenarioName: 'asc'
      }
    });

    // Format logs for frontend display (adjust based on raw query result structure if needed)
    const formattedLogs: FormattedWebhookLog[] = logsResult.map(log => ({
      ...log,
      // Ensure createdAt is treated as a Date object before formatting
      createdAt: formatDateInCentralTime(new Date(log.createdAt).toISOString()), 
      requestBody: safeJsonParse(log.requestBody), // Assuming requestBody is returned correctly
      responseBody: safeJsonParse(log.responseBody) // Assuming responseBody is returned correctly
    }));

    return NextResponse.json({
      logs: formattedLogs, // Use the result from the raw query
      total,
      page,
      totalPages: Math.ceil(total / limit),
      scenarios: scenarios.map((s: { scenarioName: string }) => s.scenarioName)
    });
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook logs' },
      { status: 500 }
    );
  }
}
