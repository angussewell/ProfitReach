import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';

export const dynamic = 'force-dynamic';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getScenarioCounts(scenario: string, propertyName: string) {
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
      properties: [propertyName, 'scenario_on_connection_date']
    });
    
    // For scenario_on_connection, verify each contact actually has this scenario
    if (propertyName === 'scenario_on_connection') {
      let verifiedCount = response.results.filter(contact => {
        const scenarioResponses = contact.properties.scenario_on_connection?.split(';') || [];
        return scenarioResponses.some(s => s.trim() === scenario);
      }).length;
      
      // If we hit the limit, we need to do pagination
      if (response.total > response.results.length) {
        let after = response.paging?.next?.after;
        while (after) {
          await wait(100); // Rate limiting
          const nextResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
            filterGroups: [{
              filters: [{
                propertyName,
                operator: FilterOperatorEnum.ContainsToken,
                value: scenario
              }]
            }],
            limit: 100,
            after,
            sorts: [],
            properties: [propertyName, 'scenario_on_connection_date']
          });
          
          const additionalVerified = nextResponse.results.filter(contact => {
            const scenarioResponses = contact.properties.scenario_on_connection?.split(';') || [];
            return scenarioResponses.some(s => s.trim() === scenario);
          }).length;
          
          verifiedCount += additionalVerified;
          after = nextResponse.paging?.next?.after;
        }
      }
      
      return verifiedCount;
    }
    
    return response.total;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = parseInt(error.headers?.['retry-after'] || '1', 10);
      await wait(retryAfter * 1000);
      try {
        return await getScenarioCounts(scenario, propertyName); // Recursive retry
      } catch (retryError) {
        console.error(`Error in retry for ${scenario}:`, retryError);
        return 0;
      }
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
          await wait(100); // Add delay between API calls to avoid rate limits
          
          // Get total count from past_sequences (contacts who have gone through this sequence)
          const totalCount = await getScenarioCounts(scenario, 'past_sequences');
          
          // Get positive reply count from scenario_on_connection (contacts who responded to this sequence)
          await wait(100); // Add delay between API calls
          const positiveReplyCount = await getScenarioCounts(scenario, 'scenario_on_connection');
          
          return {
            name: scenario,
            totalCount,
            positiveReplyCount,
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