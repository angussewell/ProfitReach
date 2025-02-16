import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UnipileClient } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Get all email accounts with Unipile IDs
    const emailAccounts = await prisma.emailAccount.findMany({
      where: {
        unipileAccountId: {
          not: '',
        }
      }
    });

    console.log(`Found ${emailAccounts.length} email accounts to update`);

    const unipileClient = new UnipileClient();
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Update each account's webhook URL
    for (const account of emailAccounts) {
      try {
        if (!account.unipileAccountId) continue;
        
        await unipileClient.setWebhookUrl(account.unipileAccountId, 'https://app.messagelm.com/api/webhooks/unipile');
        results.success++;
        
        console.log(`Updated webhook URL for account: ${account.email}`);
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Failed to update ${account.email}: ${error instanceof Error ? error.message : String(error)}`
        );
        
        console.error(`Error updating webhook URL for account: ${account.email}`, error);
      }
    }

    return NextResponse.json({
      message: 'Webhook URL update completed',
      results
    });
  } catch (error) {
    console.error('Error updating webhook URLs:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook URLs' },
      { status: 500 }
    );
  }
} 