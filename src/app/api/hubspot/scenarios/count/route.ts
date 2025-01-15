import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth.config';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ScenarioOption {
  label: string;
  value: string;
  hidden: boolean;
  displayOrder: number;
}

interface ScenarioCount {
  scenario: string;
  count: number;
  error: boolean;
}

interface CacheData {
  scenarios: ScenarioCount[];
}

interface Cache {
  timestamp: number;
  data: CacheData | null;
  expiryTime: number;
}

// Cache the results for 1 hour
let cache: Cache = {
  timestamp: 0,
  data: null,
  expiryTime: 60 * 60 * 1000 // 1 hour in milliseconds
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 5;
const BASE_DELAY = 1000; // 1 second

async function fetchWithRetry(url: string, options: RequestInit, retryCount = 0): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // If rate limited, wait and retry
    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryCount);
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await wait(delay);
        return fetchWithRetry(url, options, retryCount + 1);
      }
    }
    
    return response;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(2, retryCount);
      console.log(`Request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await wait(delay);
      return fetchWithRetry(url, options, retryCount + 1);
    }
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get('Authorization');
    
    if (!session?.accessToken || !authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Please sign in to access this resource' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    if (token !== session.accessToken) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 401 }
      );
    }

    // Check cache
    if (cache.data && (Date.now() - cache.timestamp) < cache.expiryTime) {
      return NextResponse.json(cache.data);
    }

    // First, fetch the property definition to get all possible values
    const propertyResponse = await fetchWithRetry(
      'https://api.hubapi.com/properties/v2/contacts/properties/named/past_sequences',
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // If property doesn't exist, return empty scenarios
    if (propertyResponse.status === 404) {
      const emptyResult = { scenarios: [] };
      cache = {
        timestamp: Date.now(),
        data: emptyResult,
        expiryTime: cache.expiryTime
      };
      return NextResponse.json(emptyResult);
    }

    if (!propertyResponse.ok) {
      const errorText = await propertyResponse.text();
      console.error('Failed to fetch property definition:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch scenarios' },
        { status: propertyResponse.status }
      );
    }

    const propertyData = await propertyResponse.json();
    console.log('Property data:', propertyData);

    // Now fetch counts for each scenario with better spacing between requests
    const scenarioCounts = [];
    for (const option of propertyData.options) {
      const response = await fetchWithRetry(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: 'past_sequences',
                operator: 'EQ',
                value: option.value
              }]
            }],
            properties: ['past_sequences'],
            limit: 1,
            total: true
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch count for ${option.label}:`, errorText);
        scenarioCounts.push({
          scenario: option.label,
          count: 0,
          error: true
        });
        continue;
      }

      const data = await response.json();
      console.log(`Count for ${option.label}:`, data);

      scenarioCounts.push({
        scenario: option.label,
        count: data.total,
        error: false
      });

      // Add a longer delay between requests to be more conservative
      await wait(500); // 500ms between requests
    }

    // Cache the results
    cache = {
      timestamp: Date.now(),
      data: { 
        scenarios: scenarioCounts
          .filter(s => !s.error)
          .sort((a: ScenarioCount, b: ScenarioCount) => b.count - a.count)
      },
      expiryTime: cache.expiryTime
    };

    return NextResponse.json(cache.data);
  } catch (error) {
    console.error('Error fetching scenario counts:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching scenarios' },
      { status: 500 }
    );
  }
} 