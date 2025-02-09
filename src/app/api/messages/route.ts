import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

type MessageType = 'REAL_REPLY' | 'BOUNCE' | 'AUTO_REPLY' | 'OUT_OF_OFFICE' | 'OTHER';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const includeFiltered = url.searchParams.get('includeFiltered') === 'true';

    // Build query based on whether we want filtered messages or real replies
    const where = {
      organizationId: session.user.organizationId,
      messageType: includeFiltered 
        ? { not: 'REAL_REPLY' } // Get all non-real replies
        : 'REAL_REPLY' // Get only real replies
    };
    
    // Fetch messages
    const messages = await prisma.emailMessage.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: 100 // Limit to last 100 messages for performance
    });
    
    return NextResponse.json(messages);
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
    const { messageId, isRead } = body;
    
    if (!messageId || typeof isRead !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Update message read status
    const message = await prisma.emailMessage.update({
      where: {
        id: messageId,
        organizationId: session.user.organizationId // Ensure user has access
      },
      data: { isRead }
    });
    
    return NextResponse.json(message);
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
} 