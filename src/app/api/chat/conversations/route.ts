import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

// GET handler to retrieve all conversations for the current user
export async function GET(req: Request) {
  // Check authentication and admin role
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Not logged in' }, { status: 401 });
  }
  
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }
  
  try {
    // Get the user ID from the session
    const userId = session.user.id;

    // If we don't have a user ID in the session, return an error
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
    }

    // Get the organization ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: 'User does not belong to an organization' }, { status: 400 });
    }

    // Use raw SQL query since prisma might not have the updated model yet
    const rawConversations = await prisma.$queryRaw`
      SELECT 
        c.id, 
        c.title, 
        c."createdAt", 
        c."updatedAt", 
        (SELECT m.content 
         FROM "ChatMessage" m 
         WHERE m."conversationId" = c.id 
         ORDER BY m."createdAt" ASC LIMIT 1) as first_message
      FROM "ChatConversation" c
      WHERE c."userId" = ${userId} AND c."organizationId" = ${user.organizationId}
      ORDER BY c."updatedAt" DESC
    `;
    
    // Process the conversations to add a title preview if no title exists
    const processedConversations = (rawConversations as any[]).map((conv: any) => {
      return {
        id: conv.id,
        title: conv.title || (conv.first_message ? 
          `${conv.first_message.substring(0, 30)}${conv.first_message.length > 30 ? '...' : ''}` : 
          'New conversation'),
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
    });

    return NextResponse.json(processedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler to create a new conversation
export async function POST(req: Request) {
  // Check authentication and admin role
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Not logged in' }, { status: 401 });
  }
  
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }
  
  try {
    // Get the user ID from the session
    const userId = session.user.id;

    // If we don't have a user ID in the session, return an error
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
    }

    // Get the organization ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: 'User does not belong to an organization' }, { status: 400 });
    }

    // Get the title from the request body (optional)
    const { title } = await req.json();
    
    // Generate a unique ID (CUID format)
    const id = `c${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const now = new Date();

    // Use raw SQL query to create a new conversation
    await prisma.$executeRaw`
      INSERT INTO "ChatConversation" (id, title, "createdAt", "updatedAt", "userId", "organizationId")
      VALUES (${id}, ${title || null}, ${now}, ${now}, ${userId}, ${user.organizationId})
    `;

    // Return the created conversation
    return NextResponse.json({
      id,
      title: title || null,
      createdAt: now,
      updatedAt: now,
      userId,
      organizationId: user.organizationId
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 