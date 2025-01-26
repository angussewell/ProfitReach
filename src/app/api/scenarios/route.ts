import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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
      include: {
        signature: {
          select: {
            id: true,
            name: true,
            content: true
          }
        },
        attachments: {
          select: {
            id: true,
            name: true,
            url: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
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
    return NextResponse.json({ 
      error: 'Failed to fetch scenarios',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { 
      name, 
      description = null, 
      type = 'simple', 
      status = 'active',
      customizationPrompt = null,
      emailExamplesPrompt = null,
      signatureId = null
    } = data;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const scenario = await prisma.scenario.create({
      data: {
        name,
        organizationId: session.user.organizationId,
        ...(description && { description }),
        ...(type && { type }),
        ...(status && { status }),
        ...(signatureId && { signatureId }),
        ...(customizationPrompt && { customizationPrompt }),
        ...(emailExamplesPrompt && { emailExamplesPrompt })
      },
      include: {
        signature: {
          select: {
            id: true,
            name: true,
            content: true
          }
        },
        attachments: {
          select: {
            id: true,
            name: true,
            url: true
          }
        }
      }
    });

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error creating scenario:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return NextResponse.json({ 
        error: 'A scenario with this name already exists in your organization',
        details: error.message
      }, { status: 409 });
    }

    return NextResponse.json({ 
      error: 'Failed to create scenario',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 