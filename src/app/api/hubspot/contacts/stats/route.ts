import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';

// Add delay between API calls to avoid rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    // Get all contacts with their lead status in a single query
    const response = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [{
            propertyName: 'hs_lead_status',
            operator: FilterOperatorEnum.HasProperty
          }]
        }
      ],
      limit: 1,
      after: '0',
      sorts: [],
      properties: ['hs_lead_status'],
    });

    // Get counts for each status
    const totalActive = response.results.filter(contact => 
      contact.properties.hs_lead_status === 'IN_PROGRESS'
    ).length;

    const totalCompleted = response.results.filter(contact => 
      contact.properties.hs_lead_status === 'COMPLETED'
    ).length;

    const totalResponses = response.results.filter(contact => 
      contact.properties.hs_lead_status === 'RESPONDED'
    ).length;
    
    // Calculate response rate
    const overallResponseRate = totalActive > 0 ? 
      ((totalResponses / totalActive) * 100) : 0;

    return NextResponse.json({
      totalActive,
      totalCompleted,
      totalResponses,
      overallResponseRate,
      lastUpdated: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching stats:', error);
    
    // Check if it's a rate limit error
    if (error.response?.status === 429) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again in a few seconds.',
          totalActive: 0,
          totalCompleted: 0,
          totalResponses: 0,
          overallResponseRate: 0,
          lastUpdated: new Date().toISOString()
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch stats',
        totalActive: 0,
        totalCompleted: 0,
        totalResponses: 0,
        overallResponseRate: 0,
        lastUpdated: new Date().toISOString()
      },
      { status: error.response?.status || 500 }
    );
  }
} 