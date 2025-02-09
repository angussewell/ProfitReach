import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const scenario = await db.scenario.findUnique({
      where: { id: scenarioId }
    });

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Create scenario message with minimal fields
    const message = await db.$queryRaw`
      INSERT INTO "ScenarioMessage" ("id", "scenarioId", "threadId", "sender", "hasReplied")
      VALUES (
        gen_random_uuid(),
        ${scenarioId},
        ${threadId},
        ${recipientEmail},
        false
      )
      RETURNING *;
    `;

    return NextResponse.json({
      success: true,
      message: Array.isArray(message) ? message[0] : message
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