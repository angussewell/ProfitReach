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
    const { threadId } = body;

    // Validate required fields
    if (!threadId) {
      return NextResponse.json(
        { 
          error: 'Missing required field',
          message: 'threadId is required'
        },
        { status: 400 }
      );
    }

    // Find the first matching scenario message
    const scenarioMessage = await prisma.scenarioMessage.findFirst({
      where: { threadId }
    });

    // If no message found, return null
    if (!scenarioMessage) {
      return NextResponse.json(
        { 
          error: 'Not found',
          message: 'No scenario message found with the provided threadId'
        },
        { status: 404 }
      );
    }

    // If message found, update hasReplied to true
    const updatedMessage = await prisma.scenarioMessage.update({
      where: { id: scenarioMessage.id },
      data: { 
        hasReplied: true,
        updatedAt: new Date()
      }
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: updatedMessage.hasReplied ? 'Message marked as replied' : 'Message was already marked as replied',
      data: {
        id: updatedMessage.id,
        threadId: updatedMessage.threadId,
        hasReplied: updatedMessage.hasReplied,
        updatedAt: updatedMessage.updatedAt
      }
    });

  } catch (error) {
    console.error('Error marking message as replied:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 