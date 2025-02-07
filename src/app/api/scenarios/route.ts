import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface PropertyOption {
  label: string;
  value: string;
  description?: string;
}

interface Property {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  options: PropertyOption[];
}

// Helper function for logging
function log(level: 'error' | 'info', message: string, data?: any) {
  console[level](JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.VERCEL_ENV || 'development',
    ...data
  }));
}

export async function GET() {
  try {
    log('info', 'Fetching scenarios - start');
    const session = await getServerSession(authOptions);
    
    if (!session) {
      log('error', 'No session found');
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
    }

    if (!session.user) {
      log('error', 'No user in session', { session });
      return NextResponse.json({ error: 'Unauthorized - No user' }, { status: 401 });
    }

    if (!session.user.organizationId) {
      log('error', 'No organization ID in session', { session });
      return NextResponse.json({ error: 'Unauthorized - No organization' }, { status: 401 });
    }

    log('info', 'Fetching scenarios from database', { organizationId: session.user.organizationId });

    const scenarios = await prisma.scenario.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        signature: {
          select: {
            id: true,
            name: true,
            content: true
          }
        },
        attachment: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    log('info', 'Successfully fetched scenarios', { count: scenarios.length });

    const formattedScenarios = scenarios.map(scenario => ({
      ...scenario,
      createdAt: scenario.createdAt.toISOString(),
      updatedAt: scenario.updatedAt.toISOString()
    }));

    return NextResponse.json(formattedScenarios);
  } catch (error) {
    log('error', 'Error fetching scenarios', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Failed to fetch scenarios',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { name, touchpointType, isFollowUp, testMode, testEmail, customizationPrompt, emailExamplesPrompt, subjectLine, filters } = data;

    // Get organization ID from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const scenario = await prisma.scenario.create({
      data: {
        name,
        touchpointType,
        isFollowUp: Boolean(isFollowUp),
        testMode: Boolean(testMode),
        testEmail: testEmail || null,
        customizationPrompt,
        emailExamplesPrompt,
        subjectLine,
        filters,
        organizationId: session.user.organizationId
      }
    });

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json({ 
      error: 'Failed to create scenario',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    log('info', 'Updating scenario - start');
    
    // Get organization ID from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      log('error', 'No organization ID in session', { session });
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const data = await req.json();
    log('info', 'Received update data', { data });
    
    const { id, name, touchpointType, isFollowUp, testMode, testEmail, customizationPrompt, emailExamplesPrompt, subjectLine, filters, snippetId, attachmentId } = data;

    // First verify the scenario belongs to this organization
    const existingScenario = await prisma.scenario.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId
      }
    });

    if (!existingScenario) {
      log('error', 'Scenario not found or unauthorized', { id, organizationId: session.user.organizationId });
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    log('info', 'Updating scenario in database', { id });
    
    const scenario = await prisma.scenario.update({
      where: { id },
      data: {
        name,
        touchpointType,
        isFollowUp: Boolean(isFollowUp),
        testMode: Boolean(testMode),
        testEmail: testEmail || null,
        customizationPrompt,
        emailExamplesPrompt,
        subjectLine,
        filters,
        snippetId: snippetId || null,
        attachmentId: attachmentId || null
      }
    });

    log('info', 'Successfully updated scenario', { id });
    return NextResponse.json(scenario);
  } catch (error) {
    log('error', 'Error updating scenario', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Failed to update scenario',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 