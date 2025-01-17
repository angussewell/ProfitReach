import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Get all prompts
export async function GET() {
  try {
    const scenarios = await prisma.scenario.findMany({
      select: {
        id: true,
        name: true,
        scenarioType: true,
        subjectLine: true,
        signatureId: true,
        signature: {
          select: {
            id: true,
            signatureName: true
          }
        }
      }
    });

    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

// Create a new prompt
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, signatureId } = data;

    const createData: Prisma.ScenarioCreateInput = {
      name,
      scenarioType: 'simple',
      subjectLine: '',
      ...(signatureId ? { signature: { connect: { id: signatureId } } } : {})
    };

    const scenario = await prisma.scenario.create({
      data: createData,
      include: {
        signature: true
      }
    });

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, signatureId } = data;

    const updateData: Prisma.ScenarioUpdateInput = {
      ...(signatureId ? { signature: { connect: { id: signatureId } } } : {})
    };

    const scenario = await prisma.scenario.update({
      where: { id },
      data: updateData,
      include: {
        signature: true
      }
    });

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
} 