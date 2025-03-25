import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendMessageToWebhook } from '@/lib/chat-webhook';

const prisma = new PrismaClient();

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
    // Get the message, conversation ID, and email mode from the request body
    const { message, conversationId, emailMode = 'new' } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }
    
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const userId = session.user.id;
    // Get the organization ID from the session
    const organizationId = session.user.organizationId || 'unknown';
    
    // Verify conversation exists and belongs to this user
    const conversation = await prisma.$queryRaw`
      SELECT * FROM "ChatConversation"
      WHERE id = ${conversationId} AND "userId" = ${userId}
    `;
    
    if (!(conversation as any[])[0]) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    // Generate message IDs
    const userMessageId = `m${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const assistantMessageId = `m${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const now = new Date();
    
    // Save the user message
    await prisma.$executeRaw`
      INSERT INTO "ChatMessage" (id, content, role, "createdAt", "conversationId")
      VALUES (${userMessageId}, ${message}, 'user', ${now}, ${conversationId})
    `;
    
    // Get previous messages for this conversation
    const previousMessages = await prisma.$queryRaw`
      SELECT id, content, role, "createdAt" 
      FROM "ChatMessage" 
      WHERE "conversationId" = ${conversationId}
      ORDER BY "createdAt" ASC
    ` as { id: string; content: string; role: 'user' | 'assistant'; createdAt: Date }[];

    // Format messages for the webhook request
    const formattedPreviousMessages = previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add the current message to the previous messages
    formattedPreviousMessages.push({
      role: 'user',
      content: message
    });
    
    // Create a blank processing message instead of "Processing your request..."
    const processingMessage = "";
    const responseDate = new Date(now.getTime() + 1000); // Add 1 second
    
    // Save the initial processing message
    await prisma.$executeRaw`
      INSERT INTO "ChatMessage" (id, content, role, "createdAt", "conversationId")
      VALUES (${assistantMessageId}, ${processingMessage}, 'assistant', ${responseDate}, ${conversationId})
    `;
    
    // Return the processing message immediately to improve UX
    const response = {
      id: assistantMessageId,
      content: processingMessage,
      role: 'assistant' as const,
      createdAt: responseDate,
      conversationId,
      processingId: assistantMessageId,
      isProcessing: true // Add isProcessing flag directly to response
    };
    
    // Process the webhook call in the background
    (async () => {
      try {
        // Call the webhook service
        const aiResponse = await sendMessageToWebhook(
          message,
          formattedPreviousMessages,
          conversationId, // This will be used as sessionId in the webhook
          organizationId,
          emailMode
        );
        
        // Update the message with the real response
        await prisma.$executeRaw`
          UPDATE "ChatMessage"
          SET content = ${aiResponse}
          WHERE id = ${assistantMessageId}
        `;
        
      } catch (error) {
        console.error('Background webhook processing failed:', error);
        
        // Update with an error message if the webhook call failed
        const errorMessage = error instanceof Error 
          ? `Sorry, I couldn't process your request: ${error.message}`
          : `Sorry, I couldn't process your request at this time. Please try again later.`;
          
        await prisma.$executeRaw`
          UPDATE "ChatMessage"
          SET content = ${errorMessage}
          WHERE id = ${assistantMessageId}
        `;
      } finally {
        // Update the conversation's updatedAt timestamp
        await prisma.$executeRaw`
          UPDATE "ChatConversation"
          SET "updatedAt" = ${new Date()}
          WHERE id = ${conversationId}
        `;
      }
    })();
    
    // If this is the first message and there's no title, update the title
    const convData = (conversation as any[])[0];
    if (!convData.title) {
      const title = message.length > 30 ? `${message.substring(0, 30)}...` : message;
      await prisma.$executeRaw`
        UPDATE "ChatConversation"
        SET title = ${title}
        WHERE id = ${conversationId} AND title IS NULL
      `;
    }
    
    // Return the processing message immediately
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 