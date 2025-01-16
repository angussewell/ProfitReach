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

interface PipelineResponse {
  stages: Stage[];
  total: number;
  lastUpdated: string;
  error?: string;
}

// Cache for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
const cache = new Map<string, { data: PipelineResponse; timestamp: number }>();

// Add delay between API calls to avoid rate limits
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define the pipeline stages with correct internal names
const PIPELINE_STAGES = [
  { name: 'Marketing Qualified Lead', id: 'marketingqualifiedlead' },
  { name: 'Sales Qualified Lead', id: '205174134' },
  { name: 'Opportunity', id: '39710605' },
  { name: 'Closed Lost', id: '205609479' },
  { name: 'Customer', id: 'customer' },
  { name: 'Stale', id: '39786496' },
  { name: 'Abandoned', id: '42495546' }
];

export async function GET() {
  try {
    const cacheKey = 'pipeline-data';
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // Get companies in each stage with delay between requests
    const stageResults = [];
    let totalPipeline = 0;
    
    for (const stage of PIPELINE_STAGES) {
      try {
        // Add delay between requests
        if (stageResults.length > 0) {
          await wait(100);
        }

        const stageSearchRequest: PublicObjectSearchRequest = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'lifecyclestage',
                  operator: FilterOperatorEnum.Eq,
                  value: stage.id
                }
              ]
            }
          ],
          properties: ['lifecyclestage', 'name', 'createdate', 'hs_lastmodifieddate'],
          limit: 100,
          after: '0',
          sorts: []
        };

        const stageResponse = await hubspotClient.crm.companies.searchApi.doSearch(stageSearchRequest);
        console.log(`Stage ${stage.name} response:`, {
          total: stageResponse.total,
          results: stageResponse.results?.length,
          firstCompany: stageResponse.results?.[0]?.properties
        });
        const count = stageResponse.total;
        totalPipeline += count;

        stageResults.push({
          name: stage.name,
          id: stage.id,
          count,
          percentage: 0 // Will calculate after getting total
        });
      } catch (error) {
        console.error(`Error fetching stage ${stage.name}:`, error);
        stageResults.push({
          name: stage.name,
          id: stage.id,
          count: 0,
          percentage: 0,
          error: true
        });
      }
    }

    // Calculate percentages based on total pipeline
    if (totalPipeline > 0) {
      stageResults.forEach(stage => {
        stage.percentage = (stage.count / totalPipeline) * 100;
      });
    }

    const result = {
      stages: stageResults,
      total: totalPipeline,
      lastUpdated: new Date().toISOString()
    } as PipelineResponse;

    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error fetching pipeline data:', error);
    
    // If it's a rate limit error
    if (error.code === 429) {
      return NextResponse.json(
        {
          stages: [],
          total: 0,
          lastUpdated: new Date().toISOString(),
          error: 'Rate limit exceeded. Please try again in a few seconds.'
        } as PipelineResponse,
        { status: 429 }
      );
    }
    
    return NextResponse.json({
      stages: [],
      total: 0,
      lastUpdated: new Date().toISOString(),
      error: 'Failed to fetch pipeline data'
    } as PipelineResponse);
  }
} 