import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all scenarios for the organization
    const scenarios = await prisma.scenario.findMany({
      where: { organizationId: session.user.organizationId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true
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
    const scenarioAnalytics = scenarios.map(scenario => {
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
        id: scenario.id,
        name: scenario.name,
        createdAt: scenario.createdAt.toISOString(),
        updatedAt: scenario.updatedAt.toISOString(),
        totalContacts,
        activeContacts,
        responseCount
      };
    });

    return NextResponse.json(scenarioAnalytics);
  } catch (error) {
    console.error('Error fetching scenario analytics:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch scenario analytics',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 