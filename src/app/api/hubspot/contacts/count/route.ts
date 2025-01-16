import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // HubSpot API query to count contacts with hs_lead_status = CONNECTED
    const response = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'hs_lead_status',
          operator: FilterOperatorEnum.Eq,
          value: 'CONNECTED'
        }]
      }],
      limit: 1,
      after: '0',
      sorts: [],
      properties: ['hs_lead_status']
    });

    return NextResponse.json({
      total: response.total,
      paging: response.paging
    });
  } catch (error) {
    console.error('Error fetching contact count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 