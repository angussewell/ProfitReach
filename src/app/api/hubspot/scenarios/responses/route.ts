import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';

export const dynamic = 'force-dynamic';

interface ScenarioResponse {
  scenario: string;
  totalContacts: number;
  activeContacts: number;
  completedContacts: number;
  responses: number;
  responseRate: number;
  averageResponseTime?: number;  // Average time to response in hours
  lastResponseDate?: string;
  recentResponses: Array<{
    date: string;
    responseTime: number;  // Time to response in hours
  }>;
}

// Cache for 5 minutes to keep data fresh while avoiding rate limits
const CACHE_DURATION = 5 * 60 * 1000;
const cache = new Map<string, { data: any; timestamp: number }>();

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  try {
    const cacheKey = 'scenario-responses';
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // Get all unique scenarios from past_sequences
    const propertyResponse = await hubspotClient.crm.properties.coreApi.getByName('contacts', 'past_sequences');

    if (!propertyResponse?.options) {
      throw new Error('Failed to fetch scenarios');
    }

    const scenarios: ScenarioResponse[] = [];

    for (const option of propertyResponse.options) {
      if (option.hidden) continue;

      try {
        // 1. Get active contacts in this scenario
        const activeResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
          filterGroups: [{
            filters: [{
              propertyName: 'current_sequence',
              operator: FilterOperatorEnum.Eq,
              value: option.label
            }]
          }],
          limit: 1,
          after: '0',
          sorts: [],
          properties: ['current_sequence']
        });

        // 2. Get completed contacts for this scenario
        const completedResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
          filterGroups: [{
            filters: [{
              propertyName: 'past_sequences',
              operator: FilterOperatorEnum.Eq,
              value: option.label
            }]
          }],
          limit: 1,
          after: '0',
          sorts: [],
          properties: ['past_sequences']
        });

        // 3. Get responses with timing information
        const responseResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
          filterGroups: [{
            filters: [{
              propertyName: 'scenario_on_connection',
              operator: FilterOperatorEnum.Eq,
              value: option.label
            }, {
              propertyName: 'date_of_connection',
              operator: FilterOperatorEnum.HasProperty,
              value: 'true'
            }]
          }],
          limit: 100,  // Get more results for better timing analysis
          after: '0',
          sorts: [{
            propertyName: 'date_of_connection',
            direction: 'DESCENDING'
          } as any],
          properties: ['scenario_on_connection', 'date_of_connection']
        });

        const activeContacts = activeResponse.total;
        const completedContacts = completedResponse.total;
        const responses = responseResponse.total;
        const totalContacts = activeContacts + completedContacts;

        // Calculate response rate
        const responseRate = totalContacts > 0 ? (responses / totalContacts) * 100 : 0;

        // Process response timing information
        const recentResponses = responseResponse.results
          ?.map(result => ({
            date: result.properties.date_of_connection || '',  // Convert null to empty string
            responseTime: 24  // Placeholder - would need sequence start date to calculate actual time
          }))
          .filter(response => response.date !== '') || [];  // Filter out empty dates

        // Calculate average response time (placeholder)
        const averageResponseTime = recentResponses.length > 0
          ? recentResponses.reduce((sum, resp) => sum + resp.responseTime, 0) / recentResponses.length
          : undefined;

        scenarios.push({
          scenario: option.label,
          totalContacts,
          activeContacts,
          completedContacts,
          responses,
          responseRate,
          averageResponseTime,
          lastResponseDate: recentResponses[0]?.date || undefined,
          recentResponses
        });

        // Add a delay between requests to avoid rate limits
        await wait(100);
      } catch (error) {
        console.error(`Error processing scenario ${option.label}:`, error);
      }
    }

    const result = {
      scenarios: scenarios.sort((a, b) => b.responseRate - a.responseRate),  // Sort by highest response rate
      totalStats: {
        totalContacts: scenarios.reduce((sum, s) => sum + s.totalContacts, 0),
        totalResponses: scenarios.reduce((sum, s) => sum + s.responses, 0),
        overallResponseRate: scenarios.reduce((sum, s) => sum + s.totalContacts, 0) > 0
          ? (scenarios.reduce((sum, s) => sum + s.responses, 0) / scenarios.reduce((sum, s) => sum + s.totalContacts, 0)) * 100
          : 0
      }
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching scenario responses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 