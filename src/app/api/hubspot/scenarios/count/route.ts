import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';

export const dynamic = 'force-dynamic';

interface ScenarioStats {
  name: string;
  activeCount: number;
  completedCount: number;
  responseCount: number;
  responseRate: number;
  lastResponseDate?: string;
  isLoading?: boolean;
}

interface CacheData {
  scenarios: ScenarioStats[];
  totalActive: number;
  totalCompleted: number;
  totalResponses: number;
  overallResponseRate: number;
  lastUpdated: string;
  isRefreshing?: boolean;
}

interface Option {
  id: string;
  name: string;
  count: number;
}

interface PropertyOption {
  label: string;
  value: string;
  hidden?: boolean;
}

let cache: CacheData | null = null;
let isRefreshing = false;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(fn: () => Promise<any>, maxRetries = 5): Promise<any> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.code === 429 && retries < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retries), 10000); // Exponential backoff, max 10s
        await wait(delay);
        retries++;
        continue;
      }
      throw error;
    }
  }
}

async function fetchAllContacts(filterGroups: any[], properties: string[]): Promise<any[]> {
  const results: any[] = [];
  let hasMore = true;
  let after = '0';

  while (hasMore) {
    const response = await fetchWithRetry(() => 
      hubspotClient.crm.contacts.searchApi.doSearch({
        filterGroups,
        limit: 100,
        after,
        sorts: [],
        properties
      })
    );

    if (response.results) {
      results.push(...response.results);
    }

    if (response.paging?.next?.after) {
      after = response.paging.next.after;
      await wait(100); // Small delay between requests
    } else {
      hasMore = false;
    }
  }

  return results;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Return cache if it's still valid and not forcing refresh
    if (cache && !forceRefresh && Date.now() - new Date(cache.lastUpdated).getTime() < CACHE_DURATION) {
      return NextResponse.json(cache);
    }

    // If already refreshing, return current cache with isRefreshing flag
    if (isRefreshing) {
      return NextResponse.json({ ...cache, isRefreshing: true });
    }

    isRefreshing = true;

    try {
      // Start with empty cache if none exists
      if (!cache) {
        cache = {
          scenarios: [],
          totalActive: 0,
          totalCompleted: 0,
          totalResponses: 0,
          overallResponseRate: 0,
          lastUpdated: new Date().toISOString()
        };
      }

      // 1. Get all active sequences
      const activeContacts = await fetchAllContacts(
        [{
          filters: [{
            propertyName: 'current_sequence',
            operator: FilterOperatorEnum.HasProperty,
            value: ''
          }]
        }],
        ['current_sequence']
      );

      const activeScenarios = new Map<string, number>();
      activeContacts.forEach(contact => {
        const scenario = contact.properties.current_sequence;
        if (scenario) {
          activeScenarios.set(scenario, (activeScenarios.get(scenario) || 0) + 1);
        }
      });

      // 2. Get past sequences property
      const propertyResponse = await fetchWithRetry(() =>
        hubspotClient.crm.properties.coreApi.getByName('contacts', 'past_sequences')
      );

      if (!propertyResponse?.options) {
        throw new Error('Failed to fetch scenario options');
      }

      // 3. Process each scenario
      const scenarios: ScenarioStats[] = [];
      let totalActive = 0;
      let totalCompleted = 0;
      let totalResponses = 0;

      // Combine current and past scenarios
      const allScenarios = Array.from(new Set([
        ...Array.from(activeScenarios.keys()),
        ...propertyResponse.options
          .filter((option: PropertyOption) => !option.hidden)
          .map((option: PropertyOption) => option.label)
      ]));

      for (const scenarioName of allScenarios) {
        try {
          const activeCount = activeScenarios.get(scenarioName) || 0;

          // Get completed contacts
          const completedContacts = await fetchAllContacts(
            [{
              filters: [{
                propertyName: 'past_sequences',
                operator: FilterOperatorEnum.ContainsToken,
                value: scenarioName
              }]
            }],
            ['past_sequences']
          );

          // Get responses
          const responseContacts = await fetchAllContacts(
            [{
              filters: [{
                propertyName: 'scenario_on_connection',
                operator: FilterOperatorEnum.Eq,
                value: scenarioName
              }]
            }],
            ['scenario_on_connection', 'date_of_connection']
          );

          const completedCount = completedContacts.length;
          const responseCount = responseContacts.length;
          
          const totalLeads = completedCount + activeCount;
          const responseRate = totalLeads > 0 ? (responseCount / totalLeads) * 100 : 0;

          const lastResponseDate = responseContacts
            .map(contact => contact.properties.date_of_connection)
            .filter(Boolean)
            .sort()
            .reverse()[0];

          scenarios.push({
            name: scenarioName,
            activeCount,
            completedCount,
            responseCount,
            responseRate,
            lastResponseDate
          });

          totalActive += activeCount;
          totalCompleted += completedCount;
          totalResponses += responseCount;

          // Update cache after each scenario
          cache = {
            scenarios: scenarios.sort((a, b) => b.activeCount - a.activeCount),
            totalActive,
            totalCompleted,
            totalResponses,
            overallResponseRate: (totalActive + totalCompleted) > 0 
              ? (totalResponses / (totalActive + totalCompleted)) * 100 
              : 0,
            lastUpdated: new Date().toISOString()
          };

        } catch (error) {
          console.error(`Error processing scenario ${scenarioName}:`, error);
          // Continue with next scenario
        }
      }

      return NextResponse.json(cache);

    } finally {
      isRefreshing = false;
    }

  } catch (error) {
    console.error('Error fetching scenarios:', error);
    // If we have cache, return it with error status
    if (cache) {
      return NextResponse.json({
        ...cache,
        error: 'Failed to refresh data',
        isRefreshing: false
      });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 