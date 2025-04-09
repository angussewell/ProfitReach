import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scenario = await prisma.scenario.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId
      }
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error fetching scenario:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenario' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    console.log("API PUT /api/scenarios/[id] - Received Body:", data);

    // Destructure all fields from the request body that match the Scenario model
    const { 
      name, 
      description, 
      status, 
      signatureId, 
      customizationPrompt, 
      emailExamplesPrompt, 
      attachmentId, 
      isFollowUp, 
      snippetId, 
      subjectLine, 
      touchpointType, 
      filters, 
      testEmail, 
      testMode,
      isHighPerforming 
    } = data;

    const scenario = await prisma.scenario.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId
      }
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    // Build the update data object with all possible fields to update
    const updateData: any = {};
    
    // Text/string fields
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (customizationPrompt !== undefined) updateData.customizationPrompt = customizationPrompt;
    if (emailExamplesPrompt !== undefined) updateData.emailExamplesPrompt = emailExamplesPrompt;
    if (subjectLine !== undefined) updateData.subjectLine = subjectLine;
    if (touchpointType !== undefined) updateData.touchpointType = touchpointType;
    if (testEmail !== undefined) updateData.testEmail = testEmail;
    
    // Reference fields (potentially null)
    if (signatureId !== undefined) updateData.signatureId = signatureId || null;
    if (attachmentId !== undefined) updateData.attachmentId = attachmentId || null;
    if (snippetId !== undefined) updateData.snippetId = snippetId || null;
    
    // Boolean fields - ensure they are handled as booleans
    if (isFollowUp !== undefined) updateData.isFollowUp = Boolean(isFollowUp);
    if (testMode !== undefined) updateData.testMode = Boolean(testMode);
    if (isHighPerforming !== undefined) updateData.isHighPerforming = Boolean(isHighPerforming);
    
    // JSON field
    if (filters !== undefined) updateData.filters = filters;

    console.log("API PUT /api/scenarios/[id] - Data passed to prisma.update:", updateData);
    
    const updatedScenario = await prisma.scenario.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(updatedScenario);
  } catch (error) {
    console.error('Error updating scenario:', error);
    return NextResponse.json(
      { error: 'Failed to update scenario' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the scenario exists and belongs to the organization
    const scenario = await prisma.scenario.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId
      }
    });

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Delete the scenario
    await prisma.scenario.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    return NextResponse.json(
      { error: 'Failed to delete scenario' },
      { status: 500 }
    );
  }
}
