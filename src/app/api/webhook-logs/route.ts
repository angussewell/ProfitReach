import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

interface WhereClause {
  organizationId: string;
  status?: string;
  scenarioName?: string;
  OR?: Array<{
    contactEmail?: { contains: string; mode: 'insensitive' };
    contactName?: { contains: string; mode: 'insensitive' };
    scenarioName?: { contains: string; mode: 'insensitive' };
  }>;
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

    // Calculate offset
    const skip = (page - 1) * limit;

    // Build where clause
    const where: WhereClause = {
      organizationId: session.user.organizationId
    };
    
    if (status) where.status = status;
    if (scenario) where.scenarioName = scenario;
    if (search) {
      where.OR = [
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { scenarioName: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Fetch logs with pagination
    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.webhookLog.count({ where })
    ]);

    // Get unique scenarios for filtering
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

    return NextResponse.json({
      logs,
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