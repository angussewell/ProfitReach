import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    
    // Validate required fields
    if (!data.name || !data.touchpointType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create scenario
    const scenario = await prisma.scenario.create({
      data: {
        name: data.name,
        description: data.description,
        touchpointType: data.touchpointType,
        customizationPrompt: data.customizationPrompt,
        emailExamplesPrompt: data.emailExamplesPrompt,
        subjectLine: data.subjectLine,
        isFollowUp: data.isFollowUp || false,
        snippetId: data.snippetId,
        attachmentId: data.attachmentId,
        attachmentName: data.attachmentName,
        organizationId: session.user.organizationId,
        filters: data.filters || '[]' // Add filters with default empty array
      },
    });

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      { error: 'Failed to create scenario' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    
    // Validate required fields
    if (!data.id || !data.name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update scenario
    const updateData = {
      name: data.name,
      description: data.description,
      customizationPrompt: data.customizationPrompt,
      emailExamplesPrompt: data.emailExamplesPrompt,
      subjectLine: data.subjectLine,
      isFollowUp: data.isFollowUp === 'on' ? true : false,
      snippet: data.snippetId ? { connect: { id: data.snippetId } } : { disconnect: true },
      attachment: data.attachmentId ? { connect: { id: data.attachmentId } } : { disconnect: true },
      attachmentName: data.attachmentName,
      filters: data.filters // Don't parse again, it's already stringified
    } as const satisfies Omit<Prisma.ScenarioUpdateInput, 'filters'> & { filters: any };

    const scenario = await prisma.scenario.update({
      where: { id: data.id },
      data: updateData,
      include: {
        signature: {
          select: {
            id: true,
            name: true,
            content: true
          }
        },
        snippet: {
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
      }
    });

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error updating scenario:', error);
    return NextResponse.json(
      { error: 'Failed to update scenario' },
      { status: 500 }
    );
  }
} 