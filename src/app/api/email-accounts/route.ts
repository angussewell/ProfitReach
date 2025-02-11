import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Force dynamic API route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('Fetching email accounts - checking auth...');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      console.error('Unauthorized - no organization ID in session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Auth successful, fetching accounts for organization:', session.user.organizationId);
    
    try {
      const emailAccounts = await prisma.emailAccount.findMany({
        where: {
          organizationId: session.user.organizationId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log('Successfully fetched accounts:', {
        count: emailAccounts.length,
        organizationId: session.user.organizationId
      });

      return NextResponse.json(emailAccounts);
    } catch (dbError) {
      console.error('Database error while fetching accounts:', {
        error: dbError instanceof Error ? {
          message: dbError.message,
          stack: dbError.stack
        } : dbError,
        organizationId: session.user.organizationId
      });
      throw dbError;
    }
  } catch (error) {
    console.error('Failed to fetch email accounts:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    return NextResponse.json(
      { error: 'Failed to fetch email accounts' },
      { status: 500 }
    );
  }
} 