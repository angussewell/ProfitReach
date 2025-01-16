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
    const response = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'lifecyclestage',
          operator: FilterOperatorEnum.Eq,
          value: stage.value
        }]
      }],
      limit: 1,
      after: '0',
      sorts: [],
      properties: ['lifecyclestage']
    });
    return response.total;
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
        
        const count = await getCountForStage(stage);
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
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching lifecycle stages count:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 