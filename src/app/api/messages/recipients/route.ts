import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Import the prisma client instance
import { Prisma } from '@prisma/client'; // Import Prisma namespace for raw queries
import { log } from '@/lib/logging'; // Import the log function

// Define the expected structure of the raw query result
interface MailReefRecipientRaw {
  recipientEmail: string;
  recipientType: string;
  contactId: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get('messageId');
  const organizationId = searchParams.get('organizationId');

  // Validate required parameters
  if (!messageId) {
    return NextResponse.json({ error: 'Missing required parameter: messageId' }, { status: 400 });
  }
  if (!organizationId) {
    return NextResponse.json({ error: 'Missing required parameter: organizationId' }, { status: 400 });
  }

  log('info', `Fetching recipients for messageId: ${messageId}, organizationId: ${organizationId}`);

  try {
    // Use Prisma.$queryRaw with Prisma.sql template literal for safety
    const recipients = await prisma.$queryRaw<MailReefRecipientRaw[]>(
      Prisma.sql`
        SELECT
          "recipientEmail",
          "recipientType",
          "contactId"
        FROM
          public."MailReefRecipient"
        WHERE
          "mailReefMessageId" = ${messageId} AND "organizationId" = ${organizationId}
        ORDER BY
          "recipientType" ASC,
          "recipientEmail" ASC;
      `
    );

    log('info', `Found ${recipients.length} recipients for messageId: ${messageId}`);
    return NextResponse.json(recipients, { status: 200 });

  } catch (error) {
    log('error', `Error fetching recipients for messageId ${messageId}:`, { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to fetch recipients due to an internal server error.' }, { status: 500 });
  }
}
