import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const scenario = await prisma.scenario.findFirst({
      where: {
        name: params.name
      }
    });

    if (!scenario) {
      console.log(`Scenario not found: ${params.name}`);
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
  { params }: { params: { name: string } }
) {
  try {
    const data = await request.json();
    const { customizationPrompt, emailExamplesPrompt, signatureId } = data;

    const scenario = await prisma.scenario.findFirst({
      where: {
        name: params.name
      }
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (customizationPrompt !== undefined) updateData.customizationPrompt = customizationPrompt;
    if (emailExamplesPrompt !== undefined) updateData.emailExamplesPrompt = emailExamplesPrompt;
    if (signatureId !== undefined) updateData.signatureId = signatureId || null;

    const updatedScenario = await prisma.scenario.update({
      where: { id: scenario.id },
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

// Delete a specific scenario
export async function DELETE(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    // First find the scenario to delete
    const existingScenario = await prisma.scenario.findFirst({
      where: {
        name: decodeURIComponent(params.name),
      },
    });

    if (!existingScenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Then delete it using its ID
    await prisma.scenario.delete({
      where: {
        id: existingScenario.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting scenario:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete scenario' },
      { status: 500 }
    );
  }
} 