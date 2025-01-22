import { NextResponse } from 'next/server';
import { Prisma, Scenario } from '@prisma/client';
import hubspotClient from '@/utils/hubspotClient';
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

interface HubSpotPropertyOption {
  label: string;
  value: string;
  displayOrder: number;
  hidden: boolean;
}

interface HubSpotProperty {
  name: string;
  label: string;
  description: string;
  groupName: string;
  type: string;
  fieldType: string;
  options: HubSpotPropertyOption[];
}

export async function POST(request: Request) {
  try {
    const { name, scenarioType, subjectLine, customizationPrompt, emailExamplesPrompt, filters } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'Scenario name is required' },
        { status: 400 }
      );
    }

    // Create scenario in database
    const scenario = await prisma.scenario.create({
      data: {
        name,
        scenarioType: scenarioType || 'simple',
        subjectLine: subjectLine || '',
        customizationPrompt: customizationPrompt || '',
        emailExamplesPrompt: emailExamplesPrompt || '',
        filters: filters || []
      }
    });

    // Update HubSpot property options for all three properties
    const propertiesToUpdate = ['past_sequences', 'currently_in_scenario', 'scenarios_responded_to'];
    
    for (const propertyName of propertiesToUpdate) {
      try {
        // Get current property
        const property = await hubspotClient.apiRequest<HubSpotProperty>({
          method: 'GET',
          path: `/properties/v2/contacts/properties/named/${propertyName}`
        });

        // Find highest display order
        const options = property.options || [];
        const maxDisplayOrder = Math.max(0, ...options.map(opt => opt.displayOrder || 0));

        // Create new option with next display order
        const newOption: HubSpotPropertyOption = {
          label: name,
          value: name.toLowerCase().replace(/\s+/g, '_'),
          displayOrder: maxDisplayOrder + 1,
          hidden: false
        };

        // Add new option if it doesn't exist
        if (!options.find(opt => opt.value === newOption.value)) {
          options.push(newOption);

          // Update property with new options
          await hubspotClient.apiRequest({
            method: 'PUT',
            path: `/properties/v2/contacts/properties/named/${propertyName}`,
            body: {
              ...property,
              options
            }
          });
        }
      } catch (error) {
        console.error(`Error updating property ${propertyName}:`, error);
      }
    }

    // Clear cache
    scenariosCache = [];
    lastSyncTime = 0;

    return NextResponse.json({ success: true, scenario });
  } catch (error: any) {
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create scenario' },
      { status: error.response?.status || 500 }
    );
  }
} 