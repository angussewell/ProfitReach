import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';

export const dynamic = 'force-dynamic';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

interface LifecycleStage {
  label: string;
  value: string;
}

const LIFECYCLE_STAGES: LifecycleStage[] = [
  { label: 'Lead', value: 'lead' },
  { label: 'Marketing Qualified Lead', value: 'marketingqualifiedlead' },
  { label: 'Sales Qualified Lead', value: 'salesqualifiedlead' },
  { label: 'Opportunity', value: 'opportunity' },
  { label: 'Customer', value: 'customer' },
  { label: 'Evangelist', value: 'evangelist' },
  { label: 'Other', value: 'other' }
];

async function getCountForStage(stage: LifecycleStage) {
  try {
    // Add exponential backoff retry logic
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        const response = await hubspotClient.crm.contacts.searchApi.doSearch({
          filterGroups: [{
            filters: [{
              propertyName: 'lifecyclestage',
              operator: FilterOperatorEnum.Eq,
              value: stage.value
            }]
          }],
          properties: ['lifecyclestage'],
          limit: 1,
          after: '0',
          sorts: []
        });
        return response.total;
      } catch (error: any) {
        if (error.response?.status === 429) {
          retries++;
          if (retries === maxRetries) throw error;
          
          // Wait with exponential backoff
          const delay = Math.pow(2, retries) * 1000;
          console.log(`Rate limited, waiting ${delay}ms before retry ${retries}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries reached');
  } catch (error) {
    console.error(`Error fetching count for stage ${stage.label}:`, error);
    throw error;
  }
}

export async function GET() {
  try {
    const cacheKey = 'lifecycle-stages-count';
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    console.log('Fetching fresh lifecycle stages data');
    const stages = [];
    
    // Process stages sequentially with delay
    for (const stage of LIFECYCLE_STAGES) {
      try {
        // Add a longer delay between requests to avoid rate limits
        if (stages.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const count = await getCountForStage(stage);
        stages.push({
          label: stage.label,
          value: stage.value,
          count
        });
      } catch (error: any) {
        console.error(`Error fetching count for ${stage.label}:`, error);
        if (error.response?.status === 429) {
          // If we hit rate limit, return cached data if available
          if (cached) {
            console.log('Rate limited, returning cached data');
            return NextResponse.json(cached.data);
          }
        }
        stages.push({
          label: stage.label,
          value: stage.value,
          count: 0
        });
      }
    }

    const result = { stages };
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching lifecycle stages count:', error);
    
    // Return cached data if available on error
    const cached = cache.get('lifecycle-stages-count');
    if (cached) {
      console.log('Error occurred, returning cached data');
      return NextResponse.json(cached.data);
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 