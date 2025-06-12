import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // Assuming authOptions are correctly defined here
import { Prisma } from '@prisma/client'; // Removed MailReefRecipient import

// Define the expected shape of the parameters
interface RouteParams {
  params: {
    threadId: string;
  };
}

// Define the expected shape of an EmailMessage (adjust based on actual needs)
// Re-using the definition from universal-inbox-client.tsx for consistency
type MessageType = 'REAL_REPLY' | 'BOUNCE' | 'AUTO_REPLY' | 'OUT_OF_OFFICE' | 'OTHER';
type ConversationStatus = 'MEETING_BOOKED' | 'NOT_INTERESTED' | 'FOLLOW_UP_NEEDED' | 'NO_ACTION_NEEDED' | 'WAITING_FOR_REPLY';
type MessageSource = 'EMAIL' | 'LINKEDIN';

interface EmailMessage {
  id: string;
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  recipientEmail: string;
  content: string;
  receivedAt: Date; // Keep as Date object for sorting, will be stringified by NextResponse
  messageType: MessageType;
  isRead: boolean;
  status?: ConversationStatus | null; // Allow null
  messageSource?: MessageSource;
  socialAccountId?: string | null; // Allow null
  organizationId?: string;
  classificationScores?: JsonValue | null; // Use JsonValue from Prisma
  unipileEmailId?: string | null; // Allow null
  emailAccountId?: string | null; // Allow null
  aiSuggestion1?: string | null; // Allow null
  aiSuggestion2?: string | null; // Allow null
  aiSuggestion3?: string | null; // Allow null
} // Added missing closing brace for EmailMessage interface

// Removed LatestMessageRecipient interface, will return string[]

// Helper type for Prisma Json fields
type JsonValue = Prisma.JsonValue;


export async function GET(request: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    console.error('[API/messages/thread] Unauthorized: No session or organizationId');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { threadId } = params;
  const organizationId = session.user.organizationId;

  if (!threadId) {
    console.error('[API/messages/thread] Bad Request: Missing threadId');
    return NextResponse.json({ error: 'Bad Request: threadId is required' }, { status: 400 });
  }

  console.log(`[API/messages/thread] Fetching thread: ${threadId} for org: ${organizationId}`);

  try {
    // TODO: normalize threadId type; emergency cast for now.
    // Use a raw query to fetch messages, as the model has @@ignore
    // Ensure all necessary fields are selected and aliases match the EmailMessage interface
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
        "messageType"::text AS "messageType", -- Cast enum to text
        "isRead",
        status::text AS status, -- Cast enum to text
        "messageSource"::text AS "messageSource", -- Cast enum to text
        "socialAccountId",
        "organizationId",
        "classificationScores",
        "unipileEmailId",
        "emailAccountId",
        "aiSuggestion1",
        "aiSuggestion2",
        "aiSuggestion3"
      FROM "EmailMessage"
      -- Removed organizationId filter for admin view / hotfix
      -- Cast threadId param to text to match the column type
      WHERE "threadId" = ${threadId}::text
      ORDER BY "receivedAt" ASC; -- Order chronologically (oldest first)
    `;

    if (!messages || messages.length === 0) {
      console.log(`[API/messages/thread] Thread not found or empty: ${threadId}`);
      // Return 404 if no messages are found for this threadId and organizationId
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    console.log(`[API/messages/thread] Found ${messages.length} messages for thread: ${threadId}`);

    // Fetch recipients for the latest message using raw SQL
    const latestMessage = messages[messages.length - 1];
    let latestMessageRecipients: string[] = []; // Initialize as empty array

    if (latestMessage) {
      console.log(`[API/messages/thread] Extracting sender and recipientEmail from latest message: ${latestMessage.messageId}`);
      // Directly add sender and recipientEmail from the latest message object
      // No try/catch needed here as we're just accessing object properties
      if (latestMessage.sender) {
        latestMessageRecipients.push(latestMessage.sender);
      }
      // Always add recipientEmail if it exists, even if same as sender
      if (latestMessage.recipientEmail) { 
        latestMessageRecipients.push(latestMessage.recipientEmail);
      }
      // Removed deduplication to allow sender/recipient to both appear if identical
      
      console.log(`[API/messages/thread] Constructed recipient list: [${latestMessageRecipients.join(', ')}]`);
    }
    // Removed the database query block and its try/catch

    // Dates are automatically handled by NextResponse.json
    // Return messages and the recipients list
    return NextResponse.json({ messages, latestMessageRecipients });

  } catch (error) {
    console.error(`[API/messages/thread] Error fetching thread ${threadId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Log specific Prisma errors
      console.error('Prisma Error Code:', error.code);
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
