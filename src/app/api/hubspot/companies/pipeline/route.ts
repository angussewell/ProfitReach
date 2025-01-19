import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';

// Cache results for 5 minutes unless explicitly refreshed
export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface HubSpotSearchResponse {
  total: number;
  results: Array<{
    id: string;
    properties: {
      lifecyclestage?: string;
    };
  }>;
  paging?: {
    next?: {
      after?: string;
    };
  };
}

interface Stage {
  name: string;
  id: string;
  count: number;
  percentage: number;
}

const STAGES: Array<{ name: string; id: string }> = [
  { name: 'Marketing Qualified Lead', id: 'marketingqualifiedlead' },
  { name: 'Sales Qualified Lead', id: '205174134' },
  { name: 'Opportunity', id: '39710605' },
  { name: 'Customer', id: 'customer' },
  { name: 'Closed Lost', id: '205609479' },
  { name: 'Stale', id: '39786496' },
  { name: 'Abandoned', id: '42495546' }
];

// In-memory cache
let cache: {
  data: { stages: Stage[], total: number } | null;
  lastUpdated: number;
} = {
  data: null,
  lastUpdated: 0
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchAllCompanies(requestId: string): Promise<Map<string, number>> {
  const stageCounts = new Map<string, number>();
  let after: string | undefined;
  let retryCount = 0;
  const maxRetries = 3;

  do {
    try {
      const response = await hubspotClient.apiRequest<HubSpotSearchResponse>({
        method: 'POST',
        path: '/crm/v3/objects/companies/search',
        body: {
          filterGroups: [{
            filters: [{
              propertyName: 'lifecyclestage',
              operator: 'IN',
              values: STAGES.map(stage => stage.id)
            }]
          }],
          properties: ['lifecyclestage'],
          limit: 100,
          after
        },
        timeoutMs: 30000
      });

      // Count companies by lifecycle stage
      response.results.forEach(company => {
        const stage = company.properties.lifecyclestage;
        if (stage) {
          stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
        }
      });

      after = response.paging?.next?.after;
      console.log(`[${requestId}] Fetched page: ${response.results.length} companies`);

      if (!after) break;

      await new Promise(resolve => setTimeout(resolve, 500));
      retryCount = 0;
    } catch (error: any) {
      if (error.status === 429) {
        retryCount++;
        if (retryCount > maxRetries) {
          console.log(`[${requestId}] Max retries reached, returning current counts`);
          break;
        }
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        console.log(`[${requestId}] Rate limit hit, waiting ${delay}ms... (retry ${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  } while (after);

  return stageCounts;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === '1';
    const requestId = Math.random().toString(36).substring(7);

    // Check for force refresh
    if (forceRefresh) {
      console.log(`[${requestId}] Force refreshing pipeline data`);
      cache.data = null;
    }

    // Return cached data if available and not forcing refresh
    if (!forceRefresh && cache.data && (Date.now() - cache.lastUpdated) < CACHE_TTL) {
      console.log(`[${requestId}] Returning cached pipeline data`);
      return NextResponse.json({ ...cache.data, fromCache: true });
    }

    console.log(`[${requestId}] Fetching fresh pipeline data`);
    const stageCounts = await fetchAllCompanies(requestId);
    
    const total = Array.from(stageCounts.values()).reduce((sum, count) => sum + count, 0);
    
    const stages: Stage[] = STAGES.map(stage => ({
      name: stage.name,
      id: stage.id,
      count: stageCounts.get(stage.id) || 0,
      percentage: total > 0 ? ((stageCounts.get(stage.id) || 0) / total) * 100 : 0
    }));

    const data = {
      stages,
      total,
      lastUpdated: new Date().toISOString()
    };
    
    // Update cache
    cache.data = data;
    cache.lastUpdated = Date.now();

    console.log(`[${requestId}] Pipeline data fetched successfully:`, {
      totalCompanies: total,
      stageBreakdown: stages.map(s => `${s.name}: ${s.count}`)
    });

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error fetching pipeline data:', error);
    
    // Return cached data if available
    if (cache.data) {
      return NextResponse.json({
        ...cache.data,
        fromCache: true,
        error: 'Error fetching fresh data'
      });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch pipeline data' },
      { status: error.response?.status || 500 }
    );
  }
} 