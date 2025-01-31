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
        attachment: {
          select: {
            id: true,
            name: true,
            url: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get webhook logs for analytics
    const webhookLogs = await prisma.webhookLog.findMany({
      where: {
        organizationId: session.user.organizationId,
        scenarioName: {
          in: scenarios.map(s => s.name)
        }
      },
      select: {
        scenarioName: true,
        status: true,
        createdAt: true
      }
    });

    // Get metrics for analytics
    const metrics = await prisma.metric.findMany({
      where: {
        organizationId: session.user.organizationId,
        scenarioName: {
          in: scenarios.map(s => s.name)
        }
      },
      select: {
        scenarioName: true,
        enrollments: true,
        replies: true
      }
    });

    // Calculate analytics for each scenario
    const formattedScenarios = scenarios.map(scenario => {
      const scenarioLogs = webhookLogs.filter(log => log.scenarioName === scenario.name);
      const scenarioMetrics = metrics.find(m => m.scenarioName === scenario.name);
      
      // Calculate total contacts from webhook logs
      const totalContacts = scenarioLogs.length;
      
      // Calculate active contacts (contacts in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeContacts = scenarioLogs.filter(log => 
        new Date(log.createdAt) > thirtyDaysAgo
      ).length;

      // Calculate response count from metrics
      const responseCount = scenarioMetrics?.replies || 0;

      return {
        ...scenario,
        createdAt: scenario.createdAt.toISOString(),
        updatedAt: scenario.updatedAt.toISOString(),
        totalContacts,
        activeContacts,
        responseCount
      };
    });

    return NextResponse.json(formattedScenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
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
    const scenario = await prisma.scenario.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        customizationPrompt: data.customizationPrompt,
        emailExamplesPrompt: data.emailExamplesPrompt,
        subjectLine: data.subjectLine,
        isFollowUp: data.isFollowUp === 'on' ? true : false,
        snippetId: data.snippetId || null,
        attachmentId: data.attachmentId || null,
        attachmentName: data.attachmentName,
        filters: data.filters || '[]',
      },
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
            name: true,
            url: true
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