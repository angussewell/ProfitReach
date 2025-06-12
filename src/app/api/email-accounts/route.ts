import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Assuming authOptions is correctly defined here
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Force dynamic API route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('Fetching email accounts - checking auth...');
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) { // Check for user ID as a basic auth check
      console.error('Unauthorized - no user session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionOrganizationId = session.user.organizationId;
    if (!sessionOrganizationId) {
        console.error('Unauthorized - no organization ID in session');
        return NextResponse.json({ error: 'Unauthorized - Organization context missing' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const targetOrganizationIdParam = searchParams.get('targetOrganizationId');

    let effectiveOrganizationId: string | null = null;

    console.log(`Session Org ID: ${sessionOrganizationId}, Query Params: messageId=${messageId}, targetOrganizationId=${targetOrganizationIdParam}`);

    if (messageId) {
      console.log(`Fetching organization ID from EmailMessage table via raw SQL for messageId: ${messageId}`);
      try {
        // Use queryRawUnsafe because messageId is a variable. Ensure proper sanitization if needed, though Prisma handles basic parameterization.
        // Assuming the column containing the message identifier passed in the URL is 'messageId'. Adjust if it's 'id'.
        const messages: { organizationId: string }[] = await prisma.$queryRawUnsafe(
          `SELECT "organizationId" FROM "EmailMessage" WHERE "messageId" = $1 LIMIT 1`,
          messageId
        );

        if (messages.length > 0 && messages[0].organizationId) {
          effectiveOrganizationId = messages[0].organizationId;
          console.log(`Using organization ID from message (raw query): ${effectiveOrganizationId}`);
        } else {
          console.warn(`Message with messageId ${messageId} not found in EmailMessage table or lacks organizationId. Falling back.`);
          // Fallback to session org ID if message context fails via raw query.
          effectiveOrganizationId = sessionOrganizationId;
        }
      } catch (rawQueryError) {
        console.error(`Raw SQL query failed for messageId ${messageId}:`, rawQueryError);
        // Fallback on error during raw query
        effectiveOrganizationId = sessionOrganizationId; 
      }
    } else if (targetOrganizationIdParam) {
      effectiveOrganizationId = targetOrganizationIdParam;
      console.log(`Using targetOrganizationId from query param: ${effectiveOrganizationId}`);
    } else {
      effectiveOrganizationId = sessionOrganizationId;
      console.log(`Using organization ID from session: ${effectiveOrganizationId}`);
    }

    // Final check to ensure we have an organization ID to use
    if (!effectiveOrganizationId) {
        console.error('Could not determine effective organization ID.');
        return NextResponse.json({ error: 'Failed to determine organization context' }, { status: 400 });
    }

    console.log(`Auth successful, fetching accounts for effective org: ${effectiveOrganizationId}`);

    try {
      // Define the where clause using the determined organizationId
      const whereClause: Prisma.EmailAccountWhereInput = {
        organizationId: effectiveOrganizationId,
        // Optionally add other conditions like isActive: true if needed everywhere
        // isActive: true, 
      };

      console.log(`Applying where clause for email accounts: ${JSON.stringify(whereClause)}`);

      const emailAccounts = await prisma.emailAccount.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          unipileAccountId: true,
          createdAt: true,
          updatedAt: true,
          // Include necessary fields
          dailySendLimit: true,
          dailySendCount: true,
          isActive: true, // Ensure isActive is selected (only once)
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Add isHidden flag for UI purposes
      const accountsWithVisibility = emailAccounts.map(account => ({
        ...account,
        isHidden: account.name === 'LinkedIn Integration'
      }));

      // Updated console log to use effectiveOrganizationId
      console.log(`Successfully fetched ${emailAccounts.length} accounts for organization ${effectiveOrganizationId}.`);

      return NextResponse.json(accountsWithVisibility);
    } catch (dbError) {
      console.error('Database error while fetching accounts:', {
        error: dbError instanceof Error ? { message: dbError.message, stack: dbError.stack } : dbError,
        organizationId: effectiveOrganizationId, // Log the org ID used
        sessionOrganizationId: session.user.organizationId // Also log session org ID for comparison
      });
      // Re-throw or return a specific error response
      return NextResponse.json({ error: 'Database error fetching accounts' }, { status: 500 });
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
