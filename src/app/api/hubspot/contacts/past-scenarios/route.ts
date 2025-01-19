import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';

// Cache results for 5 minutes unless explicitly refreshed
export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface HubSpotSearchResponse {
  total: number;
  results: Array<{
    properties: Record<string, string | undefined>;
  }>;
  paging?: {
    next?: {
      after?: string;
    };
  };
}

interface ScenarioStats {
  name: string;
  totalCount: number;
  activeCount: number;
  responseCount: number;
  lastUpdated: string;
}

// Known scenarios from your configuration
const SCENARIOS = [
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

// In-memory cache
let cache: {
  data: { scenarios: ScenarioStats[] } | null;
  lastUpdated: number;
} = {
  data: null,
  lastUpdated: 0
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchContactsByProperty(property: string, requestId: string): Promise<Map<string, { count: number, lastUpdated?: string }>> {
  const counts = new Map<string, { count: number, lastUpdated?: string }>();
  let after: string | undefined;
  let retryCount = 0;
  const maxRetries = 3;

  do {
    try {
      const response = await hubspotClient.apiRequest<HubSpotSearchResponse>({
        method: 'POST',
        path: '/crm/v3/objects/contacts/search',
        body: {
          filterGroups: [{
            filters: [{
              propertyName: property,
              operator: 'HAS_PROPERTY',
              value: null
            }]
          }],
          properties: [property, 'date_of_connection'],
          limit: 100,
          after
        },
        timeoutMs: 30000
      });

      // Process results
      response.results.forEach(contact => {
        const value = contact.properties[property];
        if (value) {
          const scenarios: string[] = value.split(';').map((s: string) => s.trim());
          scenarios.forEach((scenario: string) => {
            if (SCENARIOS.includes(scenario)) {
              const current = counts.get(scenario) || { count: 0 };
              current.count++;
              if (property === 'scenarios_responded_to' && contact.properties.date_of_connection) {
                if (!current.lastUpdated || contact.properties.date_of_connection > current.lastUpdated) {
                  current.lastUpdated = contact.properties.date_of_connection;
                }
              }
              counts.set(scenario, current);
            }
          });
        }
      });

      after = response.paging?.next?.after;
      console.log(`[${requestId}] Fetched ${property} page: ${response.results.length} contacts`);

      if (!after) break;

      await new Promise(resolve => setTimeout(resolve, 500));
      retryCount = 0;
    } catch (error: any) {
      if (error.status === 429) {
        retryCount++;
        if (retryCount > maxRetries) {
          console.log(`[${requestId}] Max retries reached for ${property}, returning current counts`);
          break;
        }
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        console.log(`[${requestId}] Rate limit hit for ${property}, waiting ${delay}ms... (retry ${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  } while (after);

  return counts;
}

export async function GET(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';
  
  // Check cache unless force refresh
  if (!forceRefresh && cache.data && (Date.now() - cache.lastUpdated) < CACHE_TTL) {
    console.log(`[${requestId}] Returning cached scenarios data`);
    return NextResponse.json({
      ...cache.data,
      lastUpdated: new Date(cache.lastUpdated).toISOString(),
      fromCache: true
    });
  }

  console.log(`[${requestId}] Starting scenarios fetch`);

  try {
    // Fetch all data in parallel
    const [pastCounts, activeCounts, responseCounts] = await Promise.all([
      fetchContactsByProperty('past_sequences', requestId),
      fetchContactsByProperty('currently_in_scenario', requestId),
      fetchContactsByProperty('scenarios_responded_to', requestId)
    ]);

    const scenarios: ScenarioStats[] = SCENARIOS
      .map(scenario => ({
        name: scenario,
        totalCount: pastCounts.get(scenario)?.count || 0,
        activeCount: activeCounts.get(scenario)?.count || 0,
        responseCount: responseCounts.get(scenario)?.count || 0,
        lastUpdated: responseCounts.get(scenario)?.lastUpdated || new Date().toISOString()
      }))
      .filter(s => s.totalCount > 0 || s.activeCount > 0)
      .sort((a, b) => b.totalCount - a.totalCount);

    // Update cache
    cache = {
      data: { scenarios },
      lastUpdated: Date.now()
    };

    console.log(`[${requestId}] Scenarios data fetched successfully:`, {
      totalScenarios: scenarios.length,
      hasData: scenarios.some(s => s.totalCount > 0 || s.activeCount > 0)
    });

    return NextResponse.json({
      scenarios,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching scenarios:`, error);
    // If cache exists and error, return cached data
    if (cache.data) {
      console.log(`[${requestId}] Returning cached data due to error`);
      return NextResponse.json({
        ...cache.data,
        lastUpdated: new Date(cache.lastUpdated).toISOString(),
        fromCache: true
      });
    }
    return NextResponse.json({ 
      error: error.message,
      scenarios: []
    }, { status: 500 });
  }
} 