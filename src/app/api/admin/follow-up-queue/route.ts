import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Corrected import path
import { Prisma, ConversationStatus } from '@prisma/client'; // For error handling and enum

// Define interface matching the actual query results
interface FollowUpQueueItem {
  id: string;
  threadId: string; // Added threadId
  subject: string | null;
  sender: string | null;
  recipientEmail: string | null; // Matches alias/column name
  content: string | null;
  receivedAt: Date; // Matches alias/column name
  status: ConversationStatus; // Use enum type
  organizationId: string; // Matches alias/column name
  organizationName: string | null; // Matches alias
  // Add suggestion fields to the interface used within the API route
  aiSuggestion1?: string | null;
  aiSuggestion2?: string | null;
  aiSuggestion3?: string | null;
  // Add fields needed for frontend display/logic
  messageId?: string;
  emailAccountId?: string;
  contactId?: string;
  contactFirstName?: string;
  contactLastName?: string;
  messageSource?: string; // 'EMAIL' or 'LINKEDIN'
  socialAccountId?: string;
}

import { getServerSession } from 'next-auth/next'; // Import getServerSession
import { authOptions } from '@/lib/auth'; // Assuming authOptions exist

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    console.error('[FOLLOW-UP-QUEUE] Unauthorized: No session or organizationId');
    // Return empty array instead of error to avoid breaking frontend if session expires
    return NextResponse.json([], { status: 200 });
  }
  const organizationId = session.user.organizationId; // Keep for potential future use, but query ignores it now

  try {
    // Query to get the latest message for each thread where the latest message needs follow-up (admin view - all orgs)
    const sqlQuery = Prisma.sql` -- Use Prisma.sql for better formatting and potential future safety
      WITH RankedMessages AS (
        SELECT
          em.id,
          em."threadId",
          em.subject,
          em.sender,
          em."recipientEmail",
          em.content,
          em."receivedAt",
          em.status,
          em."organizationId",
          org.name AS "organizationName",
          em."aiSuggestion1",
          em."aiSuggestion2",
          em."aiSuggestion3",
          em."messageId",
          em."emailAccountId",
          c.id AS "contactId",
          c."firstName" AS "contactFirstName",
          c."lastName" AS "contactLastName",
          em."messageSource"::text AS "messageSource",
          em."socialAccountId",
          -- Partition by org and thread to handle non-unique threadIds across orgs
          ROW_NUMBER() OVER(PARTITION BY em."organizationId", em."threadId" ORDER BY em."receivedAt" DESC) as rn -- Removed trailing comma
        FROM "EmailMessage" em
        LEFT JOIN "Organization" org ON org.id = em."organizationId"
        LEFT JOIN "Contacts" c ON c.email = em.sender OR c.email = em."recipientEmail" AND c."organizationId" = em."organizationId" -- Basic contact matching by email
        -- Removed organization filter: WHERE em."organizationId" = ${organizationId}::uuid
      )
      SELECT
        id,
        "threadId",
        subject,
        sender,
        "recipientEmail",
        content,
        "receivedAt",
        status::text AS status, -- Cast status back to text for JSON compatibility if needed, or handle enum on client
        "organizationId",
        "organizationName",
        "aiSuggestion1",
        "aiSuggestion2",
        "aiSuggestion3",
        "messageId",
        "emailAccountId",
        "contactId",
        "contactFirstName",
        "contactLastName",
        "messageSource",
        "socialAccountId"
      FROM RankedMessages
      -- Filter for the latest message (rn=1) AND ensure its status requires follow-up using explicit text cast
      WHERE rn = 1 AND status::text = 'FOLLOW_UP_NEEDED'
      ORDER BY "receivedAt" DESC
      LIMIT 200;
    `;

    console.log('[FOLLOW-UP-QUEUE] Executing SQL:', sqlQuery.sql, 'Params:', sqlQuery.values); // Log the query

    const rows = await prisma.$queryRaw<FollowUpQueueItem[]>(sqlQuery);

    // Stringify dates before sending
    const formattedRows = rows.map(row => ({
      ...row,
      receivedAt: row.receivedAt.toISOString(),
      // Ensure status is stringified if not handled by default JSON serialization
      status: row.status as string, // Explicit cast if needed
    }));

    return NextResponse.json(formattedRows);

  } catch (err) {
    console.error('[FOLLOW-UP-QUEUE] Error fetching data:', err);
     // Log specific Prisma errors if needed
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma Error Code:', err.code);
        console.error('Prisma Error Meta:', err.meta);
    }
    // Graceful fallback: return empty array with 200 status
    return NextResponse.json([], { status: 200 });
  }
}
