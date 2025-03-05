import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

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
    // Support both hasEmail and hasMessage parameters for backward compatibility
    const hasMessage = searchParams.get('hasMessage') === 'true' || searchParams.get('hasEmail') === 'true';

    // Calculate offset
    const skip = (page - 1) * limit;

    // Build where clause
    let whereConditions: any[] = [
      { organizationId: session.user.organizationId }
    ];
    
    if (status) {
      whereConditions.push({ status });
    }
    
    if (scenario) {
      whereConditions.push({ scenarioName: scenario });
    }
    
    if (hasMessage) {
      whereConditions.push({ 
        OR: [
          // Check for non-empty emailSubject
          { 
            emailSubject: { 
              not: null 
            },
            AND: {
              emailSubject: { 
                not: "" 
              }
            }
          },
          // Check for non-empty emailHtmlBody
          { 
            emailHtmlBody: { 
              not: null 
            },
            AND: {
              emailHtmlBody: { 
                not: "" 
              }
            }
          }
        ]
      });
    }
    
    if (search) {
      whereConditions.push({
        OR: [
          { contactEmail: { contains: search, mode: 'insensitive' } },
          { contactName: { contains: search, mode: 'insensitive' } },
          { scenarioName: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    const where = { AND: whereConditions };

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