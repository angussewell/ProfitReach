import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const LIFECYCLE_STAGES = [
  { 
    label: 'Marketing Qualified Lead', 
    value: 'marketingqualifiedlead',
    propertyName: 'hs_lifecycle_stage',
    propertyValue: 'marketingqualifiedlead'
  },
  { 
    label: 'Sales Qualified Lead', 
    value: 'salesqualifiedlead',
    propertyName: 'hs_lifecycle_stage',
    propertyValue: 'salesqualifiedlead'
  },
  { 
    label: 'Opportunity', 
    value: 'opportunity',
    propertyName: 'hs_lifecycle_stage',
    propertyValue: 'opportunity'
  },
  { 
    label: 'Customer', 
    value: 'customer',
    propertyName: 'hs_lifecycle_stage',
    propertyValue: 'customer'
  },
  { 
    label: 'Closed Lost', 
    value: 'closedlost',
    propertyName: 'hs_lifecycle_stage',
    propertyValue: 'closedlost'
  },
  { 
    label: 'Stale', 
    value: 'stale',
    propertyName: 'hs_lifecycle_stage',
    propertyValue: 'stale'
  },
  { 
    label: 'Abandoned', 
    value: 'abandoned',
    propertyName: 'hs_lifecycle_stage',
    propertyValue: 'abandoned'
  },
] as const;

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying fetch... ${retries} attempts remaining`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

async function getCountForStage(accessToken: string, stage: typeof LIFECYCLE_STAGES[number]) {
  console.log(`Fetching count for lifecycle stage: ${stage.label} (${stage.propertyValue})`);

  const searchBody = {
    filterGroups: [{
      filters: [{
        propertyName: stage.propertyName,
        operator: 'EQ',
        value: stage.propertyValue
      }]
    }],
    limit: 1,
    properties: [stage.propertyName],
    total: true
  };

  console.log(`Query for ${stage.label}:`, JSON.stringify(searchBody, null, 2));

  try {
    const response = await fetchWithRetry('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    const data = await response.json();
    
    // Log the full response for debugging
    console.log(`Full response for ${stage.label}:`, JSON.stringify(data, null, 2));
    
    if (data.total === undefined) {
      console.error(`No total found in response for ${stage.label}`);
      return 0;
    }
    
    console.log(`Found ${data.total} contacts for ${stage.label}`);
    return data.total;
  } catch (error) {
    console.error(`Error processing ${stage.label}:`, error);
    return 0;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      console.error('No access token available');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Clear cache to ensure fresh data during debugging
    cache.clear();

    console.log('Fetching fresh lifecycle stages data');
    const stages = [];
    for (const stage of LIFECYCLE_STAGES) {
      try {
        // Add a small delay between requests to avoid rate limits
        if (stages.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const count = await getCountForStage(session.accessToken!, stage);
        stages.push({
          label: stage.label,
          value: stage.value,
          count
        });
      } catch (error) {
        console.error(`Error fetching count for ${stage.label}:`, error);
        stages.push({
          label: stage.label,
          value: stage.value,
          count: 0
        });
      }
    }

    const result = { stages };
    console.log('Final result:', JSON.stringify(result, null, 2));
    cache.set('lifecycle-stages-count', { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching lifecycle stages count:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 