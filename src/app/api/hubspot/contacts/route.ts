import { NextResponse } from 'next/server';
import hubspotClient from '@/utils/hubspotClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await hubspotClient.crm.contacts.basicApi.getPage(
      10,
      undefined,
      ['email', 'firstname', 'lastname', 'company', 'phone', 'website']
    );

    return NextResponse.json({
      results: response.results,
      paging: response.paging,
      total: response.results.length
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 