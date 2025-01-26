import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scenarios = await prisma.scenario.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        signature: true,
        attachments: true
      }
    });

    // Format dates consistently for all scenarios
    const formattedScenarios = scenarios.map(scenario => ({
      ...scenario,
      createdAt: scenario.createdAt.toISOString(),
      updatedAt: scenario.updatedAt.toISOString(),
    }));

    return NextResponse.json(formattedScenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { name, description, type = 'simple' } = data;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Create the scenario with organization ID
    const scenario = await prisma.scenario.create({
      data: {
        name,
        description,
        type,
        organizationId: session.user.organizationId,
        status: 'active'
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