import { hubspotClient } from '@/utils/hubspotClient';
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

const fetchStageWithRetry = async (stage: typeof PIPELINE_STAGES[0], attempt = 1): Promise<any> => {
  try {
    await delay(500 * attempt); // Increase delay with each retry

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
      sorts: [],
    };

    const response = await hubspotClient.crm.companies.searchApi.doSearch(searchRequest);
    
    console.log(`Stage ${stage.name} response:`, {
      total: response.total,
      results: response.results.length,
      firstCompany: response.results[0]?.properties,
    });

    return {
      name: stage.name,
      id: stage.id,
      count: response.total,
      error: false,
    };
  } catch (error: any) {
    if (error.code === 429 && attempt < 3) {
      console.log(`Rate limit hit for ${stage.name}, attempt ${attempt}, retrying...`);
      return fetchStageWithRetry(stage, attempt + 1);
    }
    
    console.error(`Error fetching pipeline data for stage ${stage.name}:`, error);
    return {
      name: stage.name,
      id: stage.id,
      count: 0,
      error: true,
    };
  }
};

export async function GET() {
  try {
    // Fetch stages sequentially to avoid rate limits
    const stages = [];
    for (const stage of PIPELINE_STAGES) {
      const stageData = await fetchStageWithRetry(stage);
      stages.push(stageData);
    }

    const totalPipeline = stages.reduce((sum, stage) => sum + stage.count, 0);

    const stagesWithPercentages = stages.map(stage => ({
      ...stage,
      percentage: totalPipeline > 0 ? (stage.count / totalPipeline) * 100 : 0,
    }));

    return Response.json({
      stages: stagesWithPercentages,
      total: totalPipeline,
      lastUpdated: new Date().toLocaleTimeString(),
    });
  } catch (error) {
    console.error('Error in pipeline GET:', error);
    return Response.json({ error: 'Failed to fetch pipeline data' }, { status: 500 });
  }
} 