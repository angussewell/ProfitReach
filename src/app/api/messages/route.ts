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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const includeFiltered = url.searchParams.get('includeFiltered') === 'true';

    // Build query based on whether we want filtered messages or real replies
    const where: Prisma.EmailMessageWhereInput = {
      organizationId: session.user.organizationId,
      messageType: includeFiltered 
        ? { not: 'REAL_REPLY' as MessageType } // Get all non-real replies
        : 'REAL_REPLY' as MessageType // Get only real replies
    };
    
    // Fetch messages
    const messages = await prisma.emailMessage.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: 100 // Limit to last 100 messages for performance
    });

    // Format messages for frontend display
    const formattedMessages = messages.map(formatMessageForResponse);
    
    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
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