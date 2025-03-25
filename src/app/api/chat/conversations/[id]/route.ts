import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

// DELETE handler to remove a conversation and its messages
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  // Check authentication and admin role
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Not logged in' }, { status: 401 });
  }
  
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }
  
  try {
    const { id } = params;
    const userId = session.user.id;

    // Verify conversation exists and belongs to this user
    const conversation = await prisma.$queryRaw`
      SELECT * FROM "ChatConversation"
      WHERE id = ${id} AND "userId" = ${userId}
    `;
    
    if (!(conversation as any[])[0]) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // First delete all messages because we're using raw SQL
    await prisma.$executeRaw`
      DELETE FROM "ChatMessage"
      WHERE "conversationId" = ${id}
    `;
    
    // Then delete the conversation
    await prisma.$executeRaw`
      DELETE FROM "ChatConversation"
      WHERE id = ${id} AND "userId" = ${userId}
    `;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 