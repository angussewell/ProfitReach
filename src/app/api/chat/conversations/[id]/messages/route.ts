import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

// GET handler to retrieve messages for a specific conversation
export async function GET(
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

    // Get all messages for this conversation
    const messages = await prisma.$queryRaw`
      SELECT id, content, role, "createdAt"
      FROM "ChatMessage"
      WHERE "conversationId" = ${id}
      ORDER BY "createdAt" ASC
    `;
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler to add a message to a conversation
export async function POST(
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
    const { content, role } = await req.json();
    
    if (!content || !role || !['user', 'assistant'].includes(role)) {
      return NextResponse.json({ error: 'Invalid message data' }, { status: 400 });
    }

    // Verify conversation exists and belongs to this user
    const conversation = await prisma.$queryRaw`
      SELECT * FROM "ChatConversation"
      WHERE id = ${id} AND "userId" = ${userId}
    `;
    
    if (!(conversation as any[])[0]) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Generate a unique ID
    const messageId = `m${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const now = new Date();

    // Add the message
    await prisma.$executeRaw`
      INSERT INTO "ChatMessage" (id, content, role, "createdAt", "conversationId")
      VALUES (${messageId}, ${content}, ${role}, ${now}, ${id})
    `;

    // Update the conversation's updatedAt timestamp
    await prisma.$executeRaw`
      UPDATE "ChatConversation"
      SET "updatedAt" = ${now}
      WHERE id = ${id}
    `;

    // If this is the first message and there's no title, update the title
    const convData = (conversation as any[])[0];
    if (!convData.title) {
      const title = content.length > 30 ? `${content.substring(0, 30)}...` : content;
      await prisma.$executeRaw`
        UPDATE "ChatConversation"
        SET title = ${title}
        WHERE id = ${id} AND title IS NULL
      `;
    }

    // Return the new message
    return NextResponse.json({
      id: messageId,
      content,
      role,
      createdAt: now,
      conversationId: id
    });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 