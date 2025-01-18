import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check environment variables
    if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
      console.error('HUBSPOT_PRIVATE_APP_TOKEN is not set');
      return NextResponse.json(
        { error: 'HubSpot token not configured' },
        { status: 500 }
      );
    }

    console.log('Environment check:', {
      hasHubspotToken: !!process.env.HUBSPOT_PRIVATE_APP_TOKEN,
      nodeEnv: process.env.NODE_ENV
    });

    console.log('Fetching contacts from HubSpot...');
    
    try {
      const response = await hubspotClient.crm.contacts.basicApi.getPage(
        10,
        undefined,
        ['email', 'firstname', 'lastname', 'company', 'phone', 'website']
      );

      console.log('Successfully fetched contacts:', {
        count: response.results.length,
        hasMore: !!response.paging?.next
      });

      return NextResponse.json({
        results: response.results,
        paging: response.paging,
        total: response.results.length
      });
    } catch (apiError: any) {
      console.error('HubSpot API error:', {
        message: apiError.message,
        status: apiError.response?.status,
        data: apiError.response?.data
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch contacts from HubSpot',
          details: {
            message: apiError.message,
            status: apiError.response?.status,
            type: apiError.name
          }
        },
        { status: apiError.response?.status || 500 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: {
          message: error.message,
          type: error.name
        }
      },
      { status: 500 }
    );
  }
} 