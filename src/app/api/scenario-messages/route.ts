import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenarioId, threadId, recipientEmail } = body;

    // Validate required fields
    if (!scenarioId || !threadId || !recipientEmail) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'scenarioId, threadId, and recipientEmail are required'
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

    // Create scenario message
    const message = await prisma.scenarioMessage.create({
      data: {
        id: crypto.randomUUID(),
        scenarioId,
        threadId,
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