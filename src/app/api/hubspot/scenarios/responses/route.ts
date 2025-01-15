import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth.config';

export const dynamic = 'force-dynamic';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface ScenarioResponse {
  scenario: string;
  totalContacts: number;
  responses: number;
  responseRate: number;
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

async function getResponsesForScenario(accessToken: string, scenario: string): Promise<ScenarioResponse> {
  // Get total contacts in past scenarios
  const totalResponse = await fetchWithRetry(
    'https://api.hubapi.com/crm/v3/objects/contacts/search',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'past_sequences',
            operator: 'EQ',
            value: scenario,
          }],
        }],
        limit: 1,
        properties: ['past_sequences'],
        total: true,
      }),
    }
  );

  if (!totalResponse.ok) {
    console.error(`Failed to fetch total for ${scenario}:`, await totalResponse.text());
    throw new Error(`Failed to fetch total for ${scenario}`);
  }

  const totalData = await totalResponse.json();
  const totalContacts = totalData.total;

  // Get responses count
  const responsesResponse = await fetchWithRetry(
    'https://api.hubapi.com/crm/v3/objects/contacts/search',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'scenario_on_connection',
            operator: 'EQ',
            value: scenario,
          }],
        }],
        limit: 1,
        properties: ['scenario_on_connection'],
        total: true,
      }),
    }
  );

  if (!responsesResponse.ok) {
    console.error(`Failed to fetch responses for ${scenario}:`, await responsesResponse.text());
    throw new Error(`Failed to fetch responses for ${scenario}`);
  }

  const responsesData = await responsesResponse.json();
  const responses = responsesData.total;

  return {
    scenario,
    totalContacts,
    responses,
    responseRate: totalContacts > 0 ? (responses / totalContacts) * 100 : 0,
  };
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

    const cacheKey = 'scenario-responses';
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached scenario responses:', cached.data);
      return NextResponse.json(cached.data);
    }

    // First, get all unique scenarios from past_sequences
    const scenariosResponse = await fetchWithRetry(
      'https://api.hubapi.com/properties/v2/contacts/properties/named/past_sequences',
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!scenariosResponse.ok) {
      console.error('Failed to fetch scenarios:', await scenariosResponse.text());
      throw new Error('Failed to fetch scenarios');
    }

    const scenariosData = await scenariosResponse.json();
    const scenarios = scenariosData.options.map((option: any) => option.value);

    // Get response data for each scenario
    const scenarioResponses: ScenarioResponse[] = [];
    for (const scenario of scenarios) {
      try {
        const responseData = await getResponsesForScenario(session.accessToken, scenario);
        scenarioResponses.push(responseData);
        await wait(100); // Add delay between requests
      } catch (error) {
        console.error(`Error processing ${scenario}:`, error);
      }
    }

    // Check for additional scenarios in scenario_on_connection that aren't in past_sequences
    const additionalResponse = await fetchWithRetry(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'scenario_on_connection',
              operator: 'HAS_PROPERTY',
            }],
          }],
          properties: ['scenario_on_connection'],
          limit: 100,
        }),
      }
    );

    if (additionalResponse.ok) {
      const additionalData = await additionalResponse.json();
      const additionalScenarios = new Set<string>();
      
      additionalData.results.forEach((contact: any) => {
        const scenario = contact.properties.scenario_on_connection;
        if (scenario && !scenarios.includes(scenario)) {
          additionalScenarios.add(scenario);
        }
      });
      // Add response data for additional scenarios
      for (const scenario of Array.from(additionalScenarios)) {
        try {
          const responseData = await getResponsesForScenario(session.accessToken, scenario);
          scenarioResponses.push(responseData);
          await wait(100);
        } catch (error) {
          console.error(`Error processing additional scenario ${scenario}:`, error);
        }
      }
    }

    // Sort by response rate in descending order
    scenarioResponses.sort((a, b) => b.responseRate - a.responseRate);

    const result = { scenarios: scenarioResponses };
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