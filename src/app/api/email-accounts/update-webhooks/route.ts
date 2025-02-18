import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Webhook URLs
const WEBHOOK_URLS = [
  'https://messagelm.app.n8n.cloud/webhook-test/sending-replies',
  'https://messagelm.app.n8n.cloud/webhook/sending-replies'
];

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all email accounts for the organization
    const emailAccounts = await prisma.emailAccount.findMany({
      where: {
        organizationId: session.user.organizationId,
        isActive: true
      }
    });

    // Update webhook for each account
    const results = await Promise.all(emailAccounts.map(async (account) => {
      try {
        // Send webhook update request to both URLs
        await Promise.all(WEBHOOK_URLS.map(url => 
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: account.unipileAccountId,
              organizationId: account.organizationId,
              action: 'update_webhook'
            })
          })
        ));

        return {
          accountId: account.id,
          status: 'success'
        };
      } catch (error) {
        console.error(`Failed to update webhook for account ${account.id}:`, error);
        return {
          accountId: account.id,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }));

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Error updating webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to update webhooks' },
      { status: 500 }
    );
  }
} 