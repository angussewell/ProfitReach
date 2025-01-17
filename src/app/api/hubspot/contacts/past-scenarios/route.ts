import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';

export const dynamic = 'force-dynamic';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getScenarioCounts(scenario: string, propertyName: string, retryCount = 0) {
  try {
    const response = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName,
          operator: FilterOperatorEnum.ContainsToken,
          value: scenario
        }]
      }],
      limit: 100,
      after: '0',
      sorts: [],
      properties: [propertyName]
    });
    
    return response.total;
  } catch (error: any) {
    if (error.code === 429 && retryCount < 3) {
      const retryAfter = parseInt(error.headers?.['retry-after'] || '1', 10);
      console.log(`Rate limit hit for ${scenario}, retry ${retryCount + 1} in ${retryAfter}s`);
      await wait(retryAfter * 1000);
      return getScenarioCounts(scenario, propertyName, retryCount + 1);
    }
    console.error(`Error getting counts for ${scenario}:`, error);
    return 0;
  }
}

export async function GET() {
  try {
    // First, get the past_sequences property to get all possible scenarios
    const propertyResponse = await hubspotClient.crm.properties.coreApi.getByName('contacts', 'past_sequences');

    if (!propertyResponse?.options) {
      throw new Error('Failed to fetch scenario options');
    }

    // Get all valid scenarios from the property options
    const scenarios = propertyResponse.options
      .filter(option => !option.hidden)
      .map(option => option.label);

    const result = {
      scenarios: await Promise.all(
        scenarios.map(async (scenario) => {
          // Get total count from past_sequences (contacts who have gone through this sequence)
          const totalCount = await getScenarioCounts(scenario, 'past_sequences');
          await wait(100); // Add delay between API calls to avoid rate limits
          
          // Get positive reply count from scenarios_responded_to
          const positiveReplyCount = await getScenarioCounts(scenario, 'scenarios_responded_to');
          await wait(100); // Add delay between API calls
          
          // Get count of contacts currently in this scenario
          const currentCount = await getScenarioCounts(scenario, 'currently_in_scenario');
          
          return {
            name: scenario,
            totalCount,
            positiveReplyCount,
            currentCount,
            error: false
          };
        })
      ),
      total: scenarios.length,
      lastUpdated: new Date().toISOString()
    };

    // Sort scenarios by total count descending
    result.scenarios.sort((a, b) => b.totalCount - a.totalCount);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching past scenarios:', error);
    
    // If it's a rate limit error, return a specific error message
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