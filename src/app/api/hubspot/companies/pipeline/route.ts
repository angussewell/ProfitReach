import { hubspotClient } from '@/utils/hubspotClient';
import { FilterOperatorEnum, PublicObjectSearchRequest } from '@hubspot/api-client/lib/codegen/crm/companies';
import { NextResponse } from 'next/server';

interface Stage {
  name: string;
  id: string;
  count: number;
  percentage: number;
  error?: boolean;
}

const PIPELINE_STAGES = [
  { name: 'Marketing Qualified Lead', id: 'marketingqualifiedlead' },
  { name: 'Sales Qualified Lead', id: '205174134' },
  { name: 'Opportunity', id: '39710605' },
  { name: 'Closed Lost', id: '205609479' },
  { name: 'Customer', id: 'customer' },
  { name: 'Stale', id: '39786496' },
  { name: 'Abandoned', id: '42495546' }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  try {
    const stages: Stage[] = [];
    let totalPipeline = 0;

    for (const stage of PIPELINE_STAGES) {
      try {
        await delay(200);

        const searchRequest: PublicObjectSearchRequest = {
          filterGroups: [{
            filters: [{
              propertyName: 'lifecyclestage',
              operator: FilterOperatorEnum.Eq,
              value: stage.id
            }]
          }],
          properties: ['name', 'createdate', 'hs_lastmodifieddate', 'lifecyclestage'],
          limit: 100,
          after: '0',
          sorts: []
        };

        const response = await hubspotClient.crm.companies.searchApi.doSearch(searchRequest);
        
        console.log(`Stage ${stage.name} response:`, {
          total: response.total,
          results: response.results.length,
          firstCompany: response.results[0]?.properties
        });

        const count = response.total;
        totalPipeline += count;

        stages.push({
          name: stage.name,
          id: stage.id,
          count,
          percentage: 0
        });
      } catch (error: any) {
        console.error(`Error fetching stage ${stage.name}:`, error);
        stages.push({
          name: stage.name,
          id: stage.id,
          count: 0,
          percentage: 0,
          error: true
        });
      }
    }

    stages.forEach(stage => {
      stage.percentage = totalPipeline > 0 ? (stage.count / totalPipeline) * 100 : 0;
    });

    return NextResponse.json({
      stages,
      total: totalPipeline,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pipeline data:', error);
    return NextResponse.json({ error: 'Failed to fetch pipeline data' }, { status: 500 });
  }
} 