import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma, ConversationStatus } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface EmailMessage {
  id: string;
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  recipientEmail: string;
  content: string;
  receivedAt: Date;
  messageType: string;
  isRead: boolean;
  status: ConversationStatus | null;
  messageSource: string;
  socialAccountId: string | null;
  organizationId: string;
  emailAccountId: string | null;
  aiSuggestion1: string | null;
  aiSuggestion2: string | null;
  aiSuggestion3: string | null;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'admin') {
    console.error('[EMAIL-SEARCH] Unauthorized: Not an admin');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const searchEmail = url.searchParams.get('email');

    if (!searchEmail) {
      console.error('[EMAIL-SEARCH] Bad Request: Missing email parameter');
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    console.log(`[EMAIL-SEARCH] Searching for emails with: ${searchEmail}`);

    // Use raw SQL query to find all emails where the searchEmail is EITHER sender OR recipientEmail
    const messages = await prisma.$queryRaw<EmailMessage[]>`
      SELECT
        id,
        "messageId",
        "threadId",
        subject,
        sender,
        "recipientEmail",
        content,
        "receivedAt",
        "messageType"::text AS "messageType",
        "isRead",
        status::text AS status,
        "messageSource"::text AS "messageSource",
        "socialAccountId",
        "organizationId",
        "emailAccountId",
        "aiSuggestion1",
        "aiSuggestion2",
        "aiSuggestion3"
      FROM "EmailMessage"
      WHERE 
        sender = ${searchEmail}
        OR "recipientEmail" = ${searchEmail}
      ORDER BY "receivedAt" ASC
    `;

    console.log(`[EMAIL-SEARCH] Found ${messages.length} messages`);

    // Format dates for JSON response
    const formattedMessages = messages.map(message => ({
      ...message,
      receivedAt: message.receivedAt.toISOString()
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('[EMAIL-SEARCH] Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Error Code:', error.code);
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
