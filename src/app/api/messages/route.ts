import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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
}

// Type for our formatted response
interface FormattedEmailMessage extends Omit<EmailMessage, 'receivedAt'> {
  receivedAt: string;
}

// Helper function to format message for frontend display
function formatMessageForResponse(message: EmailMessage): FormattedEmailMessage {
  return {
    ...message,
    receivedAt: formatDateInCentralTime(message.receivedAt.toISOString())
  };
}

export async function GET(request: Request) {
  console.log('Messages API: Starting request');
  
  try {
    const session = await getServerSession(authOptions);
    console.log('Messages API: Session data:', {
      isAuthenticated: !!session,
      userId: session?.user?.id,
      organizationId: session?.user?.organizationId,
      role: session?.user?.role
    });

    if (!session?.user?.organizationId) {
      console.log('Messages API: No organization ID in session');
      return NextResponse.json({ error: 'Unauthorized - No organization ID' }, { status: 401 });
    }

    const url = new URL(request.url);
    const includeFiltered = url.searchParams.get('includeFiltered') === 'true';
    console.log('Query params:', { includeFiltered });

    // Use raw SQL queries since EmailMessage is marked with @ignore in the schema
    // First count the messages
    const countResult = await prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*) as count 
      FROM "EmailMessage" 
      WHERE "organizationId" = ${session.user.organizationId}
    `;
    
    const messageCount = Number(countResult[0]?.count) || 0;

    console.log('Total messages in database:', {
      organizationId: session.user.organizationId,
      count: messageCount
    });

    // Then fetch the messages
    const messages = await prisma.$queryRaw<EmailMessage[]>`
      SELECT * FROM "EmailMessage" 
      WHERE "organizationId" = ${session.user.organizationId}
      ORDER BY "receivedAt" DESC
      LIMIT 100
    `;

    console.log('Found messages:', {
      count: messages.length,
      sampleMessageId: messages[0]?.id || 'no messages',
      statuses: messages.map((m: EmailMessage) => m.status)
    });

    // Format messages for frontend display
    const formattedMessages = messages.map(formatMessageForResponse);
    
    console.log('GET /api/messages - Success');
    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('Messages API Error:', error);
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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, status } = body;

    if (!messageId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update message status using raw SQL
    const currentTimestamp = new Date().toISOString();
    
    // First update the status
    await prisma.$executeRaw`
      UPDATE "EmailMessage"
      SET "status" = ${status}, "statusChangedAt" = ${currentTimestamp}
      WHERE "id" = ${messageId}
    `;
    
    // Then retrieve the updated message
    const updatedMessages = await prisma.$queryRaw<EmailMessage[]>`
      SELECT * FROM "EmailMessage" 
      WHERE "id" = ${messageId}
    `;
    
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
