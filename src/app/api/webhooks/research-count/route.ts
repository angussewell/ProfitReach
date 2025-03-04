import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    // Get the session to extract organizationId
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organizationId from session
    const organizationId = session.user.organizationId;
    
    // Get date range from query parameters
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    if (!from || !to) {
      return NextResponse.json({ error: 'Missing date range parameters' }, { status: 400 });
    }

    // Execute raw Prisma query to count unique contacts
    const result = await db.$queryRaw<[{count: bigint}]>(
      Prisma.sql`
        SELECT COUNT(DISTINCT "contactEmail") as count
        FROM "WebhookLog"
        WHERE "scenarioName" = 'Basic Research'
        AND "organizationId" = ${organizationId}
        AND "createdAt" >= ${new Date(from)}
        AND "createdAt" <= ${new Date(to)}
      `
    );
    
    // Extract count from result
    const count = Number(result[0]?.count || 0);
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error counting research contacts:', error);
    return NextResponse.json({ error: 'Failed to count research contacts' }, { status: 500 });
  }
} 