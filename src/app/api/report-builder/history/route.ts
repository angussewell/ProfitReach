import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const configId = searchParams.get('configId');

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Filter by organization through ReportBuilderConfig relation
    where.ReportBuilderConfig = {
      organizationId: session.user.organizationId,
    };

    // Optionally filter by specific config
    if (configId) {
      where.reportBuilderConfigId = configId;
    }

    // Fetch report history with related data
    const history = await prisma.reportHistory.findMany({
      where,
      include: {
        ReportBuilderConfig: {
          select: {
            id: true,
            name: true,
            webhookUrl: true,
          },
        },
        Contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            fullName: true,
            currentCompanyName: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await prisma.reportHistory.count({
      where,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      history,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching report history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report history' },
      { status: 500 }
    );
  }
}