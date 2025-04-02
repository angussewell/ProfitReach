import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Input validation schema
const statsQuerySchema = z.object({
  startDate: z.string().datetime({ message: "Invalid start date format" }),
  endDate: z.string().datetime({ message: "Invalid end date format" }),
});

// Typed interface for the result
interface ReplyLogGroup {
  userEmail: string;
  _count: {
    _all: number;
  };
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    // Ensure user is logged in and is an admin (or appropriate role)
    if (!session?.user?.organizationId || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    };

    // Validate query parameters
    const validationResult = statsQuerySchema.safeParse(queryParams);
    if (!validationResult.success || !queryParams.startDate || !queryParams.endDate) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error?.errors },
        { status: 400 }
      );
    }

    const { startDate, endDate } = validationResult.data;
    const organizationId = session.user.organizationId;

    console.log(`[API /setter-stats] Fetching stats for org ${organizationId} from ${startDate} to ${endDate}`);

    // Direct SQL query since Prisma client might not have the model registered yet
    const stats = await prisma.$queryRaw`
      SELECT "userEmail", COUNT(*) as "replyCount"
      FROM "ReplyLog"
      WHERE "organizationId" = ${organizationId}
        AND "repliedAt" >= ${new Date(startDate)}
        AND "repliedAt" <= ${new Date(endDate)}
      GROUP BY "userEmail"
      ORDER BY "replyCount" DESC
    `;

    console.log(`[API /setter-stats] Found ${Array.isArray(stats) ? stats.length : 0} users with replies.`);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('[API /setter-stats] Error fetching setter stats:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching setter stats' },
      { status: 500 }
    );
  }
} 