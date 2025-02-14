import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Mail360Client } from '@/lib/mail360';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Get all email accounts with Mail360 keys
    const emailAccounts = await prisma.emailAccount.findMany({
      where: {
        unipileAccountId: { not: null }
      }
    });

    console.log(`Found ${emailAccounts.length} Mail360 accounts to update`);

    const mail360Client = new Mail360Client();
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Update each account's webhook URL
    for (const account of emailAccounts) {
      try {
        if (!account.unipileAccountId) continue;
        
        await mail360Client.updateAccountSettings(account.unipileAccountId);
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