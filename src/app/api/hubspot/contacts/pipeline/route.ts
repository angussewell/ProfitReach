import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';

interface Stage {
  name: string;
  id: string;
  count?: number;
  percentage?: number;
  error?: boolean;
}

const STAGES: Stage[] = [
  { name: 'Marketing Qualified Lead', id: 'marketingqualifiedlead' },
  { name: 'Sale Qualified Lead', id: '205174134' },
  { name: 'Opportunity', id: '39710605' },
  { name: 'Closed Lost', id: '205609479' },
  { name: 'Customer', id: 'customer' },
  { name: 'Stale', id: '39786496' },
  { name: 'Abandoned', id: '42495546' },
  { name: 'Churned', id: '207876275' }
];

// Cache for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
const cache = new Map<string, { data: any; timestamp: number }>();

// Add delay between API calls to avoid rate limits
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  try {
    const cacheKey = 'pipeline-stages';
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    const stages: Stage[] = [];
    let total = 0;

    for (const stage of STAGES) {
      try {
        // Add delay between requests to avoid rate limits
        if (stages.length > 0) {
          await wait(100);
        }

        const response = await hubspotClient.crm.contacts.searchApi.doSearch({
          filterGroups: [{
            filters: [{
              propertyName: 'lifecyclestage',
              operator: FilterOperatorEnum.Eq,
              value: stage.id
            }]
          }],
          limit: 1,
          properties: ['lifecyclestage']
        });

        const count = response.total;
        total += count;

        stages.push({
          ...stage,
          count
        });
      } catch (error) {
        console.error(`Error fetching count for stage ${stage.name}:`, error);
        stages.push({
          ...stage,
          count: 0,
          error: true
        });
      }
    }

    const result = {
      stages: stages.map(stage => ({
        ...stage,
        percentage: total > 0 ? (stage.count! / total) * 100 : 0
      })),
      total,
      lastUpdated: new Date().toISOString()
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching pipeline stages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline data' },
      { status: 500 }
    );
  }
} 