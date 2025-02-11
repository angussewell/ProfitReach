import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    },
    { status: 405 }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenarioId, messageId, threadId, recipientEmail } = body;

    // Use messageId if provided, otherwise use threadId
    const messageIdentifier = messageId || threadId;

    // Validate required fields
    if (!scenarioId || !messageIdentifier || !recipientEmail) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'scenarioId, (messageId or threadId), and recipientEmail are required'
        },
        { status: 400 }
      );
    }

    // Verify scenario exists
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId }
    });

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Create scenario message with minimal fields
    const message = await prisma.scenarioMessage.create({
      data: {
        scenarioId,
        messageId: messageIdentifier,
        threadId: messageIdentifier,
        sender: recipientEmail,
        hasReplied: false
      }
    });

    return NextResponse.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Error creating scenario message:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create scenario message',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 