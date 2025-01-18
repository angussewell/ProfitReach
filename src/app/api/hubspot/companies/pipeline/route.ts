import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';
import { FilterOperatorEnum, PublicObjectSearchRequest } from '@hubspot/api-client/lib/codegen/crm/companies';

// Define response type for HubSpot search API
interface HubSpotSearchResponse {
  total: number;
  results: Array<{
    id: string;
    properties: {
      name: string;
      createdate: string;
      hs_lastmodifieddate: string;
      lifecyclestage: string;
    };
  }>;
}

// Define pipeline stages with correct HubSpot lifecycle stage IDs
const PIPELINE_STAGES = [
  { name: 'Marketing Qualified Lead', id: 'marketingqualifiedlead' },
  { name: 'Sales Qualified Lead', id: '205174134' },
  { name: 'Opportunity', id: '39710605' },
  { name: 'Closed Lost', id: '205609479' },
  { name: 'Customer', id: 'customer' },
  { name: 'Stale', id: '39786496' },
  { name: 'Abandoned', id: '42495546' }
];

// Cache configuration with persistence
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_STALE_WHILE_REVALIDATE = 30 * 60 * 1000; // 30 minutes
interface CacheEntry {
  data: any;
  timestamp: number;
  lastSuccessfulFetch: number;
}
const cache: Record<string, CacheEntry> = {};

// Helper function to get cached data with stale-while-revalidate
const getCachedData = (key: string): { data: any | null; isStale: boolean } => {
  const entry = cache[key];
  if (!entry) return { data: null, isStale: false };
  
  const now = Date.now();
  const age = now - entry.timestamp;
  
  if (age <= CACHE_TTL) {
    return { data: entry.data, isStale: false };
  }
  
  if (age <= CACHE_STALE_WHILE_REVALIDATE) {
    return { data: entry.data, isStale: true };
  }
  
  delete cache[key];
  return { data: null, isStale: false };
};

// Helper function to set cached data
const setCachedData = (key: string, data: any, wasSuccessful: boolean = true) => {
  const now = Date.now();
  const existing = cache[key];
  
  cache[key] = {
    data,
    timestamp: now,
    lastSuccessfulFetch: wasSuccessful ? now : (existing?.lastSuccessfulFetch || now)
  };
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to validate token with detailed logging
const validateEnvironment = () => {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) {
    console.error('HUBSPOT_PRIVATE_APP_TOKEN is not set');
    throw new Error('HubSpot token not configured');
  }

  // Log token details for debugging (safely)
  console.log('Token validation:', {
    length: token.length,
    prefix: token.slice(0, 7),
    suffix: token.slice(-4),
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });

  return token;
};

// Helper function to fetch data for a single stage with retries
async function fetchStageData(stage: typeof PIPELINE_STAGES[0], requestId: string) {
  const searchRequest: PublicObjectSearchRequest = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'lifecyclestage',
            operator: FilterOperatorEnum.Eq,
            value: stage.id,
          },
        ],
      },
    ],
    properties: ['name', 'createdate', 'hs_lastmodifieddate', 'lifecyclestage'],
    limit: 100,
    after: '0',
    sorts: []
  };

  // Log the request for debugging
  console.log(`[${requestId}] Fetching data for stage ${stage.name}:`, {
    request: searchRequest,
    timestamp: new Date().toISOString()
  });

  try {
    const token = validateEnvironment();
    const response = await hubspotClient.apiRequest<HubSpotSearchResponse>({
      method: 'POST',
      path: '/crm/v3/objects/companies/search',
      body: searchRequest,
      timeoutMs: 15000, // 15 second timeout per stage
      queryParams: {
        hapikey: token
      }
    });

    // Log the raw response for debugging
    console.log(`[${requestId}] Response for stage ${stage.name}:`, {
      hasResults: !!response?.results,
      total: response?.total,
      timestamp: new Date().toISOString()
    });

    if (!response?.results) {
      throw new Error('No results in response');
    }

    return {
      name: stage.name,
      id: stage.id,
      count: response.total || 0,
      error: false,
    };
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching pipeline data for stage ${stage.name}:`, {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Return error state for this stage
    return {
      name: stage.name,
      id: stage.id,
      count: 0,
      error: true,
      errorMessage: error.message
    };
  }
}

// Helper function to process pipeline data
const processPipelineData = (stages: any[], requestId: string) => {
  const totalPipeline = stages.reduce((sum, stage) => sum + stage.count, 0);

  const stagesWithPercentages = stages.map(stage => ({
    ...stage,
    percentage: totalPipeline > 0 ? (stage.count / totalPipeline) * 100 : 0,
  }));

  return {
    stages: stagesWithPercentages,
    total: totalPipeline,
    lastUpdated: new Date().toISOString(),
    requestId
  };
};

export async function GET() {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Starting pipeline data fetch`, {
    timestamp: new Date().toISOString()
  });

  try {
    // Validate environment
    validateEnvironment();

    // Check cache with stale-while-revalidate
    const { data: cachedData, isStale } = getCachedData('pipeline_data');
    
    // If we have fresh cache data, return it
    if (cachedData && !isStale) {
      console.log(`[${requestId}] Returning fresh cached pipeline data`, {
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(cachedData);
    }

    // If we have stale data, trigger background refresh and return stale data
    if (cachedData && isStale) {
      console.log(`[${requestId}] Returning stale cached data and triggering refresh`, {
        timestamp: new Date().toISOString()
      });
      
      // Trigger background refresh
      fetchPipelineData(requestId).catch(error => {
        console.error(`[${requestId}] Background refresh failed:`, {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      });
      
      return NextResponse.json({
        ...cachedData,
        isStale: true
      });
    }

    // No cache data available, fetch fresh data
    const responseData = await fetchPipelineData(requestId);
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error(`[${requestId}] Error in pipeline GET:`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Try to return cached data on error
    const { data: cachedData } = getCachedData('pipeline_data');
    if (cachedData) {
      console.log(`[${requestId}] Returning cached data after error`, {
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({
        ...cachedData,
        fromCache: true,
        error: error.message
      });
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch pipeline data',
        message: error.message,
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Helper function to fetch pipeline data
async function fetchPipelineData(requestId: string) {
  // Fetch stages sequentially with proper delays
  const stages = [];
  let consecutiveErrors = 0;
  let hasAnySuccess = false;
  
  for (const stage of PIPELINE_STAGES) {
    try {
      // Add increasing delay between requests if we're seeing errors
      const delayTime = consecutiveErrors > 0 ? Math.min(consecutiveErrors * 1000, 5000) : 500;
      await delay(delayTime);
      
      const stageData = await fetchStageData(stage, requestId);
      stages.push(stageData);
      
      // Track success/failure
      if (!stageData.error) {
        hasAnySuccess = true;
        consecutiveErrors = 0;
      } else {
        consecutiveErrors++;
      }
    } catch (error) {
      consecutiveErrors++;
      stages.push({
        name: stage.name,
        id: stage.id,
        count: 0,
        error: true
      });
    }
  }

  const responseData = processPipelineData(stages, requestId);

  // Cache the response based on success
  setCachedData('pipeline_data', responseData, hasAnySuccess);

  console.log(`[${requestId}] Successfully fetched pipeline data`, {
    totalStages: stages.length,
    totalCompanies: responseData.total,
    hasAnySuccess,
    timestamp: new Date().toISOString()
  });

  return responseData;
} 