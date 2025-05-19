import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAuth } from '@/lib/auth/session';

// Force dynamic API route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { session, error } = await validateAuth();
    if (error) {
      return error;
    }

    const accounts = await prisma.socialAccount.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching social accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social accounts' },
      { status: 500 }
    );
  }
} 