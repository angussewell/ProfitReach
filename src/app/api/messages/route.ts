import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { formatDateInCentralTime } from '@/lib/date-utils';

type MessageType = 'REAL_REPLY' | 'BOUNCE' | 'AUTO_REPLY' | 'OUT_OF_OFFICE' | 'OTHER';
type MessageSource = 'EMAIL' | 'LINKEDIN';
type ConversationStatus = 'MEETING_BOOKED' | 'NOT_INTERESTED' | 'FOLLOW_UP_NEEDED' | 'NO_ACTION_NEEDED' | 'WAITING_FOR_REPLY';

// Define a type that matches the EmailMessage model since we can't import it directly
interface EmailMessage {
  id: string;
  messageId: string;
  threadId: string;
  organizationId: string;
  emailAccountId: string;
  subject: string;
  sender: string;
  recipientEmail: string;
  content: string;
  receivedAt: Date;
  messageType: MessageType;
  isRead: boolean;
  classificationScores?: any;
  unipileEmailId?: string;
  status: ConversationStatus;
  messageSource: MessageSource;
  socialAccountId?: string;
  statusChangedAt?: Date;
  aiSuggestion1?: string;
  aiSuggestion2?: string;
  aiSuggestion3?: string;
  organizationName?: string; // Added organizationName
}

// Type for our formatted response
interface FormattedEmailMessage extends Omit<EmailMessage, 'receivedAt'> {
  receivedAt: string;
  organizationName?: string; // Added organizationName
}

// Helper function to format message for frontend display
function formatMessageForResponse(message: EmailMessage): FormattedEmailMessage {
  return {
    ...message,
    organizationName: message.organizationName, // Ensure it's passed through
    receivedAt: formatDateInCentralTime(message.receivedAt.toISOString())
  };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    console.error('Messages API: Unauthorized - No session or organizationId');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Cast organizationId to string explicitly to ensure we're working with a string value
  const organizationId = String(session.user.organizationId);
  
  console.log(`Messages API: Starting GET request for Org ID: ${organizationId}`);
  
  try {
    const url = new URL(request.url);
    const includeFiltered = url.searchParams.get('includeFiltered') === 'true';
    console.log('Query params:', { includeFiltered });

    // COMPLETELY REWRITTEN: We're using direct $queryRawUnsafe with parameterized query and explicit type casting
    // This approach avoids potential issues with template literals and ensures proper parameter binding
    
    // First count the messages
    // Use parameterized query without explicit UUID casting
    const countQuery = `SELECT COUNT(*) as count FROM "EmailMessage" WHERE "organizationId" = $1`;
    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(countQuery, organizationId);
    
    // Convert bigint to number
    const messageCount = Number(countResult[0]?.count ?? 0);

    console.log('Total messages in database:', {
      organizationId: organizationId,
      count: messageCount
    });

    // Then fetch the messages
    // Use parameterized query without explicit UUID casting
    // Updated query to join with Organization table and fetch organization name
    const messagesQuery = `
      SELECT em.*, org.name as "organizationName"
      FROM "EmailMessage" em
      JOIN "Organization" org ON em."organizationId" = org.id
      WHERE em."organizationId" = $1
      ORDER BY em."receivedAt" DESC
      LIMIT 100
    `;
    const messages = await prisma.$queryRawUnsafe<EmailMessage[]>(messagesQuery, organizationId);

    console.log('Found messages:', {
      count: messages.length,
      sampleMessageId: messages[0]?.id || 'no messages',
      statuses: messages.map((m: EmailMessage) => m.status),
      organizationNames: messages.map((m: EmailMessage) => m.organizationName) // Log org names
    });

    // Format messages for frontend display
    const formattedMessages = messages.map(formatMessageForResponse);
    
    console.log('GET /api/messages - Success');
    return NextResponse.json(formattedMessages);
  } catch (error) {
    // Enhanced error logging for better diagnostics
    console.error('Messages API Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      organizationId: organizationId,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Re-enabled authorization checks
  if (!session?.user?.organizationId) {
    console.error('Messages API PATCH: Unauthorized - No session or organizationId');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { messageId, status } = body;

    if (!messageId || !status) {
      console.error('Messages API PATCH: Missing messageId or status in request body', body);
      return NextResponse.json(
        { error: 'Missing required fields: messageId and status' },
        { status: 400 }
      );
    }

    // Update message status using raw SQL with proper parameter binding
    const currentTimestamp = new Date().toISOString();
    
    // Using $executeRawUnsafe with parameterized query for the update
    const updateQuery = `
      UPDATE "EmailMessage"
      SET "status" = $1, "statusChangedAt" = $2
      WHERE "id" = $3
    `;
    await prisma.$executeRawUnsafe(updateQuery, status, currentTimestamp, messageId);
    
    // Then retrieve the updated message using $queryRawUnsafe with proper parameter binding
    // Also include organizationName in the select query for the updated message
    const selectQuery = `
      SELECT em.*, org.name as "organizationName"
      FROM "EmailMessage" em
      JOIN "Organization" org ON em."organizationId" = org.id
      WHERE em."id" = $1
    `;
    const updatedMessages = await prisma.$queryRawUnsafe<EmailMessage[]>(selectQuery, messageId);
    
    if (!updatedMessages || updatedMessages.length === 0) {
      return NextResponse.json(
        { error: 'Message not found after update' },
        { status: 404 }
      );
    }

    const updatedMessage = updatedMessages[0];

    // Format the updated message for frontend display
    const formattedMessage = formatMessageForResponse(updatedMessage);

    return NextResponse.json(formattedMessage);
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}
