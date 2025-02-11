import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailAccounts = await prisma.emailAccount.findMany({
      where: {
        organizationId: session.user.organizationId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(emailAccounts);
  } catch (error) {
    console.error('Failed to fetch email accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email accounts' },
      { status: 500 }
    );
  }
} 