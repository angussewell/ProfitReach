import { NextResponse } from 'next/server';
import { PrismaClient, Prisma, Scenario } from '@prisma/client';
import { hubspotClient } from '@/utils/hubspotClient';
import { prisma } from '@/lib/db';
import { Filter } from '@/types/filters';

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
    const formData = await request.formData();
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const subjectLine = formData.get('subjectLine') as string;
    const customizationPrompt = formData.get('customizationPrompt') as string;
    const emailExamplesPrompt = formData.get('emailExamplesPrompt') as string;
    const filtersJson = formData.get('filters') as string;

    // Parse filters
    let filters: Filter[] = [];
    try {
      filters = JSON.parse(filtersJson);
    } catch (e) {
      console.error('Failed to parse filters:', e);
      // Continue with empty filters array
    }

    const scenario = await prisma.scenario.update({
      where: { id },
      data: {
        name,
        scenarioType: type,
        subjectLine,
        customizationPrompt,
        emailExamplesPrompt,
        filters: JSON.stringify(filters)
      }
    });

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Failed to update scenario:', error);
    return NextResponse.json(
      { error: 'Failed to update scenario' },
      { status: 500 }
    );
  }
} 