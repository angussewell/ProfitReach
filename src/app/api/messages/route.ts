import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { EmailMessage, Prisma } from '@prisma/client';
import { formatDateInCentralTime } from '@/lib/date-utils';

type MessageType = 'REAL_REPLY' | 'BOUNCE' | 'AUTO_REPLY' | 'OUT_OF_OFFICE' | 'OTHER';

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

    // First check if there are any messages at all for this organization
    const messageCount = await prisma.emailMessage.count({
      where: {
        organizationId: session.user.organizationId
      }
    });

    console.log('Total messages in database:', {
      organizationId: session.user.organizationId,
      count: messageCount
    });

    // Fetch messages using raw SQL to avoid type issues
    const messages = await prisma.$queryRaw<EmailMessage[]>`
      SELECT * FROM "EmailMessage"
      WHERE "organizationId" = ${session.user.organizationId}
      AND status IN ('WAITING_FOR_REPLY', 'FOLLOW_UP_NEEDED', 'NO_ACTION_NEEDED')
      ORDER BY "receivedAt" DESC
      LIMIT 100
    `;

    console.log('Found messages:', {
      count: messages.length,
      sampleMessageId: messages[0]?.id || 'no messages',
      statuses: messages.map(m => m.status)
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

    // Update message status
    const updatedMessage = await prisma.emailMessage.update({
      where: { id: messageId },
      data: { status }
    });

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