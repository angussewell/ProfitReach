import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, { data: any; timestamp: number }>();

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface HubSpotContact {
  properties: {
    current_sequence?: string;
  };
}

interface ScenarioCount {
  scenario: string;
  count: number;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  let lastError;
  let delay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
        console.log(`Rate limited, waiting ${waitTime}ms before retry`);
        await wait(waitTime);
        delay *= 2;
        continue;
      }

      return response;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;
      if (attempt < maxRetries - 1) {
        await wait(delay);
        delay *= 2;
      }
    }
  }

  throw lastError;
}

async function getAllContactsWithSequence(accessToken: string) {
  const uniqueScenarios = new Set<string>();
  let after = 0;
  let hasMore = true;
  const pageSize = 100;

  console.log('Starting to fetch all contacts with current_sequence...');

  while (hasMore) {
    console.log(`Fetching page of contacts, starting after: ${after}`);
    
    const response = await fetchWithRetry(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'current_sequence',
                  operator: 'HAS_PROPERTY',
                },
              ],
            },
          ],
          properties: ['current_sequence'],
          limit: pageSize,
          after: after ? after.toString() : undefined,
        }),
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch contacts:', await response.text());
      throw new Error('Failed to fetch contacts');
    }

    const data = await response.json();
    console.log(`Found ${data.results.length} contacts on current page`);

    data.results.forEach((contact: HubSpotContact) => {
      if (contact.properties.current_sequence) {
        uniqueScenarios.add(contact.properties.current_sequence);
      }
    });

    // Check if there are more pages
    hasMore = data.paging?.next?.after != null;
    if (hasMore) {
      after = data.paging.next.after;
      // Add a small delay between pages to avoid rate limits
      await wait(100);
    }
  }

  console.log('Finished fetching all contacts');
  return uniqueScenarios;
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

    const cacheKey = 'current-scenarios';
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached scenarios:', cached.data);
      return NextResponse.json(cached.data);
    }

    console.log('Fetching current scenarios...');

    // Get all unique scenario values
    const uniqueScenarios = await getAllContactsWithSequence(session.accessToken);
    console.log('Unique scenarios found:', Array.from(uniqueScenarios));

    const result = { scenarios: [] as ScenarioCount[] };

    // Get counts for each unique scenario
    for (const scenarioValue of uniqueScenarios) {
      console.log('Fetching count for scenario:', scenarioValue);

      const countResponse = await fetchWithRetry(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: 'current_sequence',
                    operator: 'EQ',
                    value: scenarioValue,
                  },
                ],
              },
            ],
            limit: 1,
            properties: ['current_sequence'],
            total: true,
          }),
        }
      );

      if (countResponse.ok) {
        const countData = await countResponse.json();
        console.log(`Count for ${scenarioValue}:`, countData.total);
        result.scenarios.push({
          scenario: scenarioValue,
          count: countData.total,
        });
      } else {
        console.error(`Failed to get count for ${scenarioValue}:`, await countResponse.text());
      }

      await wait(100);
    }

    // Sort scenarios by count in descending order
    result.scenarios.sort((a, b) => b.count - a.count);

    console.log('Final result:', result);
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 