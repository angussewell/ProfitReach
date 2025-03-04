import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logging';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { scenarioId, action } = body;

    // Validate required fields
    if (!scenarioId) {
      return NextResponse.json({ error: 'Missing scenarioId' }, { status: 400 });
    }

    // Validate action
    if (action !== 'add' && action !== 'remove') {
      return NextResponse.json({ error: 'Invalid action, must be "add" or "remove"' }, { status: 400 });
    }
    
    // Find the scenario
    const scenario = await prisma.scenario.findUnique({
      where: {
        id: scenarioId,
        organizationId: session.user.organizationId
      }
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    // Create a new ScenarioMessage for "add" or find the most recent one for "remove"
    if (action === 'add') {
      // Create a new scenario response
      const newResponse = await prisma.scenarioResponse.create({
        data: {
          scenarioId: scenario.id,
          source: 'manual',
          threadId: `manual-${Date.now()}`
        }
      });
      
      log('info', 'Added manual reply', {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        responseId: newResponse.id
      });
      
      return NextResponse.json({
        success: true,
        message: 'Reply added successfully',
        data: {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          responseId: newResponse.id,
          createdAt: newResponse.createdAt
        }
      });
    } else {
      // Find the most recent manual response for this scenario
      const latestResponse = await prisma.scenarioResponse.findFirst({
        where: {
          scenarioId: scenario.id,
          source: 'manual'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!latestResponse) {
        return NextResponse.json({
          error: 'No manual replies found for this scenario'
        }, { status: 404 });
      }

      // Delete the response
      await prisma.scenarioResponse.delete({
        where: {
          id: latestResponse.id
        }
      });

      log('info', 'Removed manual reply', {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        responseId: latestResponse.id
      });

      return NextResponse.json({
        success: true,
        message: 'Reply removed successfully',
        data: {
          scenarioId: scenario.id,
          scenarioName: scenario.name
        }
      });
    }
  } catch (error) {
    log('error', 'Error handling manual reply:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Failed to process manual reply',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 