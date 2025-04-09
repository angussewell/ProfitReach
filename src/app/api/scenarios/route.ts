import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Create the scenario
    const scenario = await prisma.scenario.create({
      data: {
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
        status: 'active'
      }
    });

    return NextResponse.json(scenario, { status: 201 });
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 });
  }
}
