import { NextResponse } from 'next/server';
import hubspotClient, { withRetry } from '@/utils/hubspotClient';

interface ScenarioStats {
  name: string;
  totalCount: number;
  activeCount: number;
  responseCount: number;
  lastUpdated: string;
}

// Known scenarios
const SCENARIOS = [
  'Simple Statements Announcement',
  'Follow Up',
  'Buildium Scenario 1',
  'VRSA Webinar',
  'FinanceKit',
  'Quick Message'
];

interface HubSpotSearchResponse {
  total: number;
  results: Array<{
    id: string;
    properties: Record<string, string | undefined>;
  }>;
  paging?: {
    next?: {
      after?: string;
    };
  };
}

async function fetchContactsByProperty(
  property: string,
  value: string,
  requestId: string
): Promise<number> {
  let total = 0;
  let after: string | undefined;
  let pageCount = 0;
  const maxPages = 10;

  do {
    try {
      const response = await hubspotClient.apiRequest<HubSpotSearchResponse>({
        method: 'POST',
        path: '/crm/v3/objects/contacts/search',
        body: {
          filterGroups: [{
            filters: [{
              propertyName: property,
              operator: 'CONTAINS_TOKEN',
              value
            }]
          }],
          properties: [property],
          limit: 100,
          after
        }
      });

      total += response.results.length;
      after = response.paging?.next?.after;
      pageCount++;

      if (!after || pageCount >= maxPages) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`[${requestId}] Error fetching ${property} for ${value}:`, error);
      break;
    }
  } while (after);

  return total;
}

async function fetchScenarioCounts(requestId: string): Promise<ScenarioStats[]> {
  const scenarios = SCENARIOS;
  const results: ScenarioStats[] = [];
  
  for (const scenario of scenarios) {
    const [totalData, activeData, responseData] = await Promise.all([
      fetchContactsByProperty('past_sequences', scenario, requestId),
      fetchContactsByProperty('currently_in_scenario', scenario, requestId),
      fetchContactsByProperty('scenarios_responded_to', scenario, requestId)
    ]);

    if (totalData > 0 || activeData > 0) {
      results.push({
        name: scenario,
        totalCount: totalData,
        activeCount: activeData,
        responseCount: responseData,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  return results.sort((a, b) => b.totalCount - a.totalCount);
}

export async function GET() {
  try {
    const response = await withRetry(() => hubspotClient.crm.contacts.basicApi.getPage(1));
    const contacts = response.results;

    const scenarios = new Map<string, number>();
    
    for (const contact of contacts) {
      const currentScenario = contact.properties.current_sequence;
      if (currentScenario) {
        scenarios.set(
          currentScenario,
          (scenarios.get(currentScenario) || 0) + 1
        );
      }
    }

    const result = {
      scenarios: Array.from(scenarios.entries()).map(([scenario, count]) => ({
        scenario,
        count,
      })),
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching scenarios:', error);
    
    if (error.response?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a few seconds.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch scenarios' },
      { status: error.response?.status || 500 }
    );
  }
} 