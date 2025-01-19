import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';

// Cache results for 5 minutes unless explicitly refreshed
export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface HubSpotSearchResponse {
  total: number;
  results: Array<{
    properties: {
      current_sequence?: string;
      scenario_on_connection?: string;
      date_of_connection?: string;
    };
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

async function fetchScenarioCounts(scenario: string, requestId: string): Promise<{ total: number, active: number, responses: number, lastUpdated: string }> {
  let totalCount = 0;
  let activeCount = 0;
  let responseCount = 0;
  let lastUpdated = new Date().toISOString();
  let retryCount = 0;
  const maxRetries = 3;
  const maxPages = 10; // Safety limit
  let pageCount = 0;

  // Fetch total contacts (past_sequences)
  let totalAfter: string | undefined;
  do {
    try {
      pageCount++;
      const totalResponse = await hubspotClient.apiRequest<HubSpotSearchResponse>({
        method: 'POST',
        path: '/crm/v3/objects/contacts/search',
        body: {
          filterGroups: [{
            filters: [{
              propertyName: 'past_sequences',
              operator: 'CONTAINS_TOKEN',
              value: scenario
            }]
          }],
          properties: ['past_sequences'],
          limit: 100,
          after: totalAfter
        },
        timeoutMs: 30000
      });

      // Break if no results
      if (!totalResponse.results?.length) break;

      totalCount += totalResponse.results.length;
      totalAfter = totalResponse.paging?.next?.after;

      console.log(`[${requestId}] Fetched ${scenario} total page ${pageCount}: ${totalResponse.results.length} contacts (total: ${totalCount})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      retryCount = 0;

      // Break if reached max pages or no more pages
      if (pageCount >= maxPages || !totalAfter) break;
    } catch (error: any) {
      if (error.status === 429) {
        retryCount++;
        if (retryCount > maxRetries) {
          console.log(`[${requestId}] Max retries reached for ${scenario} total, returning current total: ${totalCount}`);
          break;
        }
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        console.log(`[${requestId}] Rate limit hit for ${scenario} total, waiting ${delay}ms... (retry ${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  } while (totalAfter);

  // Reset for active contacts
  pageCount = 0;
  retryCount = 0;
  let activeAfter: string | undefined;
  do {
    try {
      pageCount++;
      const activeResponse = await hubspotClient.apiRequest<HubSpotSearchResponse>({
        method: 'POST',
        path: '/crm/v3/objects/contacts/search',
        body: {
          filterGroups: [{
            filters: [{
              propertyName: 'currently_in_scenario',
              operator: 'CONTAINS_TOKEN',
              value: scenario
            }]
          }],
          properties: ['currently_in_scenario'],
          limit: 100,
          after: activeAfter
        },
        timeoutMs: 30000
      });

      // Break if no results
      if (!activeResponse.results?.length) break;

      activeCount += activeResponse.results.length;
      activeAfter = activeResponse.paging?.next?.after;

      console.log(`[${requestId}] Fetched ${scenario} active page ${pageCount}: ${activeResponse.results.length} contacts (total: ${activeCount})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      retryCount = 0;

      // Break if reached max pages or no more pages
      if (pageCount >= maxPages || !activeAfter) break;
    } catch (error: any) {
      if (error.status === 429) {
        retryCount++;
        if (retryCount > maxRetries) {
          console.log(`[${requestId}] Max retries reached for ${scenario} active, returning current total: ${activeCount}`);
          break;
        }
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        console.log(`[${requestId}] Rate limit hit for ${scenario} active, waiting ${delay}ms... (retry ${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  } while (activeAfter);

  // Reset for responses
  pageCount = 0;
  retryCount = 0;
  let responseAfter: string | undefined;
  do {
    try {
      pageCount++;
      const responseResponse = await hubspotClient.apiRequest<HubSpotSearchResponse>({
        method: 'POST',
        path: '/crm/v3/objects/contacts/search',
        body: {
          filterGroups: [{
            filters: [{
              propertyName: 'scenarios_responded_to',
              operator: 'CONTAINS_TOKEN',
              value: scenario
            }]
          }],
          properties: ['scenarios_responded_to', 'date_of_connection'],
          limit: 100,
          after: responseAfter
        },
        timeoutMs: 30000
      });

      // Break if no results
      if (!responseResponse.results?.length) break;

      responseCount += responseResponse.results.length;
      responseAfter = responseResponse.paging?.next?.after;

      // Update lastUpdated if we find a more recent date
      responseResponse.results.forEach(contact => {
        const date = contact.properties.date_of_connection;
        if (date && date > lastUpdated) {
          lastUpdated = date;
        }
      });

      console.log(`[${requestId}] Fetched ${scenario} response page ${pageCount}: ${responseResponse.results.length} contacts (total: ${responseCount})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      retryCount = 0;

      // Break if reached max pages or no more pages
      if (pageCount >= maxPages || !responseAfter) break;
    } catch (error: any) {
      if (error.status === 429) {
        retryCount++;
        if (retryCount > maxRetries) {
          console.log(`[${requestId}] Max retries reached for ${scenario} responses, returning current total: ${responseCount}`);
          break;
        }
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        console.log(`[${requestId}] Rate limit hit for ${scenario} responses, waiting ${delay}ms... (retry ${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  } while (responseAfter);

  console.log(`[${requestId}] Completed ${scenario}: ${totalCount} total, ${activeCount} active, ${responseCount} responses`);
  return {
    total: totalCount,
    active: activeCount,
    responses: responseCount,
    lastUpdated
  };
}

export async function GET(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';
  
  // Check cache unless force refresh
  if (!forceRefresh && cache.data && (Date.now() - cache.lastUpdated) < CACHE_TTL) {
    console.log(`[${requestId}] Returning cached current scenarios data`);
    return NextResponse.json({
      ...cache.data,
      lastUpdated: new Date(cache.lastUpdated).toISOString(),
      fromCache: true
    });
  }

  console.log(`[${requestId}] Starting current scenarios fetch`);

  try {
    const scenarios: ScenarioStats[] = [];
    
    // Process each scenario with a delay between them
    for (const scenario of SCENARIOS) {
      const counts = await fetchScenarioCounts(scenario, requestId);
      if (counts.total > 0 || counts.active > 0) { // Include if there are any contacts
        scenarios.push({
          name: scenario,
          totalCount: counts.total,
          activeCount: counts.active,
          responseCount: counts.responses,
          lastUpdated: counts.lastUpdated
        });
      }
      // Add a delay between scenarios
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Sort by total count descending
    scenarios.sort((a, b) => b.totalCount - a.totalCount);

    // Update cache
    cache = {
      data: { scenarios },
      lastUpdated: Date.now()
    };

    console.log(`[${requestId}] Current scenarios data fetched successfully:`, {
      totalScenarios: scenarios.length,
      hasData: scenarios.some(s => s.totalCount > 0 || s.activeCount > 0)
    });

    return NextResponse.json({
      scenarios,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching current scenarios:`, error);
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