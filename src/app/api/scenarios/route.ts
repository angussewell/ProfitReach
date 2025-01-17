import { NextResponse } from 'next/server';
import { PrismaClient, Prisma, Scenario } from '@prisma/client';
import { hubspotClient } from '@/utils/hubspotClient';

const prisma = new PrismaClient();

const CORRECT_SCENARIOS = [
  'Event Based',
  'SOP Kit',
  'Quick Message',
  'FinanceKit',
  'Cash Flow Optimizer',
  'Shaan Message',
  'Shaan FU 2',
  'Shaan FU 1',
  'Buildium Scenario 1',
  'VRSA Webinar',
  'Simple Statements Announcement',
  'Case Study Email',
  'Follow Up',
  'Partner Outreach',
  'Buildium Follow Up 1'
];

// Cache for scenarios to avoid multiple DB queries
let scenariosCache: Scenario[] = [];
let lastSyncTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function syncScenariosFromHubSpot() {
  try {
    // Check cache first
    const now = Date.now();
    if (scenariosCache.length > 0 && (now - lastSyncTime) < CACHE_DURATION) {
      console.log('Returning scenarios from cache');
      return scenariosCache;
    }

    console.log('Syncing scenarios from HubSpot...');

    // Create/update scenarios in Prisma
    const operations = CORRECT_SCENARIOS.map(name => 
      prisma.scenario.upsert({
        where: {
          name: name
        } as Prisma.ScenarioWhereUniqueInput,
        create: {
          name: name,
          scenarioType: 'simple',
          subjectLine: ''
        } as Prisma.ScenarioCreateInput,
        update: {}
      })
    );

    const results = await prisma.$transaction(operations);
    console.log('Synced scenarios:', results.map(r => r.name));
    
    // Update cache
    scenariosCache = results;
    lastSyncTime = now;

    return results;
  } catch (error) {
    console.error('Error syncing scenarios:', error);
    // Return cached data if available, otherwise throw
    if (scenariosCache.length > 0) {
      console.log('Returning cached scenarios due to error');
      return scenariosCache;
    }
    throw error;
  }
}

export async function GET() {
  try {
    // Sync scenarios from HubSpot first
    await syncScenariosFromHubSpot();

    // Then fetch all scenarios from the database with signatures
    const dbScenarios = await prisma.scenario.findMany({
      include: {
        signature: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(dbScenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, customizationPrompt, emailExamplesPrompt, signatureId } = data;

    // Validate that the scenario name is in our list
    if (!CORRECT_SCENARIOS.includes(name)) {
      return NextResponse.json(
        { error: 'Invalid scenario name' },
        { status: 400 }
      );
    }

    const scenario = await prisma.scenario.create({
      data: {
        name,
        scenarioType: 'simple',
        subjectLine: '',
        ...(customizationPrompt && { customizationPrompt }),
        ...(emailExamplesPrompt && { emailExamplesPrompt }),
        ...(signatureId && { signatureId })
      } as Prisma.ScenarioCreateInput
    });

    // Invalidate cache to force refresh
    scenariosCache = [];
    lastSyncTime = 0;

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      { error: 'Failed to create scenario' },
      { status: 500 }
    );
  }
} 