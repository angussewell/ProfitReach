import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';
import { FilterOperatorEnum, PublicObjectSearchRequest } from '@hubspot/api-client/lib/codegen/crm/companies';

// Define response type for HubSpot search API
interface HubSpotSearchResponse {
  total: number;
  results: Array<{
    id: string;
    properties: {
      name: string;
      createdate: string;
      hs_lastmodifieddate: string;
      lifecyclestage: string;
    };
  }>;
}

// Define pipeline stages with correct HubSpot lifecycle stage IDs
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
    // Check environment variables
    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    if (!token) {
      console.error('HUBSPOT_PRIVATE_APP_TOKEN is not set');
      return NextResponse.json(
        { error: 'HubSpot token not configured' },
        { status: 500 }
      );
    }

    // Log token length and first/last few characters for debugging
    console.log('Token check:', {
      length: token.length,
      prefix: token.slice(0, 7),
      suffix: token.slice(-4),
      nodeEnv: process.env.NODE_ENV
    });

    // Fetch stages sequentially to avoid rate limits
    const stages = [];
    for (const stage of PIPELINE_STAGES) {
      try {
        await delay(500); // Add delay between requests
        
        const searchRequest: PublicObjectSearchRequest = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'lifecyclestage',
                  operator: FilterOperatorEnum.Eq,
                  value: stage.id,
                },
              ],
            },
          ],
          properties: ['name', 'createdate', 'hs_lastmodifieddate', 'lifecyclestage'],
          limit: 100,
          after: '0',
          sorts: []
        };

        // Log the request for debugging
        console.log(`Fetching data for stage ${stage.name}:`, {
          request: searchRequest,
          timestamp: new Date().toISOString()
        });

        const response = await hubspotClient.apiRequest<HubSpotSearchResponse>({
          method: 'POST',
          path: '/crm/v3/objects/companies/search',
          body: searchRequest
        });

        // Log the raw response for debugging
        console.log(`Response for stage ${stage.name}:`, {
          hasResults: !!response?.results,
          total: response?.total,
          timestamp: new Date().toISOString()
        });

        if (!response?.results) {
          console.error(`Error fetching pipeline data for stage ${stage.name}:`, {
            error: 'No results in response',
            stage: stage.name,
            response
          });
          continue;
        }

        stages.push({
          name: stage.name,
          id: stage.id,
          count: response.total || 0,
          error: false,
        });
      } catch (error: any) {
        console.error(`Error fetching pipeline data for stage ${stage.name}:`, {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
          stack: error.stack
        });
        stages.push({
          name: stage.name,
          id: stage.id,
          count: 0,
          error: true,
        });

        // If we hit a rate limit, wait longer before the next request
        if (error.response?.status === 429) {
          await delay(2000);
        }
      }
    }

    const totalPipeline = stages.reduce((sum, stage) => sum + stage.count, 0);

    const stagesWithPercentages = stages.map(stage => ({
      ...stage,
      percentage: totalPipeline > 0 ? (stage.count / totalPipeline) * 100 : 0,
    }));

    return NextResponse.json({
      stages: stagesWithPercentages,
      total: totalPipeline,
      lastUpdated: new Date().toLocaleTimeString(),
    });
  } catch (error) {
    console.error('Error in pipeline GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline data' },
      { status: 500 }
    );
  }
} 