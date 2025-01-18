import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';
import { FilterOperatorEnum, PublicObjectSearchRequest } from '@hubspot/api-client/lib/codegen/crm/companies';

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

        const response = await hubspotClient.apiRequest({
          method: 'POST',
          path: '/crm/v3/objects/companies/search',
          body: searchRequest
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error fetching pipeline data for stage ${stage.name}:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          continue;
        }

        const data = await response.json();
        stages.push({
          name: stage.name,
          id: stage.id,
          count: data.total,
          error: false,
        });
      } catch (error) {
        console.error(`Error fetching pipeline data for stage ${stage.name}:`, error);
        stages.push({
          name: stage.name,
          id: stage.id,
          count: 0,
          error: true,
        });
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