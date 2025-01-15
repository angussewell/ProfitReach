import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // HubSpot API query to count contacts with hs_lead_status = CONNECTED
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'hs_lead_status',
            operator: 'EQ',
            value: 'CONNECTED'
          }]
        }],
        limit: 1,
        after: 0,
        properties: ['hs_lead_status'],
        total: true
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('HubSpot API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      total: data.total,
      paging: data.paging
    });
  } catch (error) {
    console.error('Error fetching contact count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 