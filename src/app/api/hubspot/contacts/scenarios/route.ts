import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';

export const revalidate = 300; // Cache for 5 minutes

// Add delay between API calls to avoid rate limits
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Contact {
  id: string;
  properties: Record<string, any>;
}

interface Scenario {
  id: string;
  name: string;
  properties: Record<string, any>;
}

async function getScenarioCount(scenario: string) {
  try {
    const response = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'current_sequence',
          operator: FilterOperatorEnum.ContainsToken,
          value: scenario
        }]
      }],
      limit: 1,
      after: '0',
      sorts: [],
      properties: ['current_sequence']
    });
    return response.total;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = parseInt(error.headers?.['retry-after'] || '1', 10);
      await wait(retryAfter * 1000);
      try {
        const response = await hubspotClient.crm.contacts.searchApi.doSearch({
          filterGroups: [{
            filters: [{
              propertyName: 'current_sequence',
              operator: FilterOperatorEnum.ContainsToken,
              value: scenario
            }]
          }],
          limit: 1,
          after: '0',
          sorts: [],
          properties: ['current_sequence']
        });
        return response.total;
      } catch (retryError) {
        return 0;
      }
    }
    return 0;
  }
}

const processContacts = (contacts: Contact[]) => {
  return contacts.map((contact: Contact) => {
    // Process contact
    return contact;
  });
};

const processScenarios = (scenarios: Scenario[]) => {
  return scenarios.map((scenario: Scenario) => {
    // Process scenario
    return scenario;
  });
};

export async function GET() {
  try {
    // First, get a sample of contacts with current_sequence
    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'current_sequence',
          operator: FilterOperatorEnum.HasProperty
        }]
      }],
      limit: 100,
      after: '0',
      sorts: [],
      properties: ['current_sequence']
    });

    // If no contacts found with current_sequence
    if (!searchResponse.total) {
      return NextResponse.json({
        scenarios: [],
        total: 0,
        lastUpdated: new Date().toISOString()
      });
    }

    // Extract unique scenario names from current_sequence
    const uniqueScenarios = new Set<string>();
    searchResponse.results.forEach(contact => {
      const currentSequences = contact.properties.current_sequence?.split(';') || [];
      currentSequences.forEach(scenario => {
        if (scenario) uniqueScenarios.add(scenario.trim());
      });
    });

    const scenarios = Array.from(uniqueScenarios);
    const result = {
      scenarios: await Promise.all(
        scenarios.map(async (scenario) => {
          await wait(100); // Add delay between API calls to avoid rate limits
          const count = await getScenarioCount(scenario);
          
          return {
            id: scenario.toLowerCase().replace(/\s+/g, '_'),
            name: scenario,
            count,
            lastUpdated: new Date().toISOString()
          };
        })
      ),
      total: searchResponse.total,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching current scenarios:', error);
    
    // If it's a rate limit error
    if (error.code === 429) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again in a few seconds.',
          scenarios: [],
          total: 0,
          lastUpdated: new Date().toISOString()
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        scenarios: [],
        total: 0,
        lastUpdated: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 