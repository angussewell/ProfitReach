import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');

    if (!fromDate || !toDate) {
      return new NextResponse('Missing date range parameters', { status: 400 });
    }

    // Query webhook logs with date filter
    const webhookLogs = await prisma.webhookLog.findMany({
      where: {
        organizationId: session.user.organizationId,
        createdAt: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group logs by scenario name
    const scenarioStats = webhookLogs.reduce((acc, log) => {
      const { scenarioName } = log;
      if (!acc[scenarioName]) {
        acc[scenarioName] = {
          totalEnrollments: 0,
          successfulEnrollments: 0,
          failedEnrollments: 0,
        };
      }

      acc[scenarioName].totalEnrollments++;
      if (log.status === 'success') {
        acc[scenarioName].successfulEnrollments++;
      } else {
        acc[scenarioName].failedEnrollments++;
      }

      return acc;
    }, {} as Record<string, { totalEnrollments: number; successfulEnrollments: number; failedEnrollments: number; }>);

    return NextResponse.json(scenarioStats);
  } catch (error) {
    console.error('Error fetching filtered webhook logs:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 