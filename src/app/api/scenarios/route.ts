import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uuidv4 } from '@/lib/uuid-fix';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const simple = searchParams.get('simple') === 'true';

  try {
    const organizationId = session.user.organizationId;
    const scenarios = await prisma.scenario.findMany({
      where: {
        organizationId,
      },
      select: simple ? {
        id: true,
        name: true,
      } : undefined,
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      touchpointType,
      customizationPrompt,
      emailExamplesPrompt,
      subjectLine,
      isFollowUp,
      snippetId,
      attachmentId,
      filters
    } = body;

    // Validate required fields
    if (!name || !touchpointType) {
      return NextResponse.json({ error: 'Name and touchpoint type are required' }, { status: 400 });
    }

    // Generate a unique ID for the scenario
    const id = uuidv4();
    
    // Current timestamp for createdAt and updatedAt fields
    const now = new Date();

    // Create the scenario
    const scenario = await prisma.scenario.create({
      data: {
        id,
        name,
        touchpointType,
        customizationPrompt: customizationPrompt || null,
        emailExamplesPrompt: emailExamplesPrompt || null,
        subjectLine: subjectLine || null,
        isFollowUp: isFollowUp || false,
        snippetId: snippetId || null,
        attachmentId: attachmentId || null,
        filters: filters || '[]',
        organizationId: session.user.organizationId,
        status: 'active',
        updatedAt: now
      }
    });

    return NextResponse.json(scenario, { status: 201 });
  } catch (error) {
    console.error('Error creating scenario:', error);
    
    // Check for Prisma unique constraint violation error
    if (error && 
        typeof error === 'object' && 
        'code' in error && 
        error.code === 'P2002' && 
        'meta' in error && 
        error.meta && 
        typeof error.meta === 'object' && 
        'target' in error.meta && 
        Array.isArray(error.meta.target) && 
        error.meta.target.includes('name') && 
        error.meta.target.includes('organizationId')) {
      return NextResponse.json(
        { error: 'A scenario with this name already exists. Please use a different name.' }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 });
  }
}
