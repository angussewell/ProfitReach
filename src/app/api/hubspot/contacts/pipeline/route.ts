import { NextResponse } from 'next/server';
import hubspotClient, { withRetry } from '@/utils/hubspotClient';

export async function GET() {
  try {
    const response = await withRetry(() => hubspotClient.crm.contacts.basicApi.getPage(1));
    const contacts = response.results;

    const stages = new Map<string, number>();
    
    for (const contact of contacts) {
      const stage = contact.properties.hs_lead_status || 'Unknown';
      stages.set(stage, (stages.get(stage) || 0) + 1);
    }

    const result = {
      stages: Array.from(stages.entries()).map(([stage, count]) => ({
        stage,
        count,
      })),
      total: contacts.length,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching pipeline stages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline data' },
      { status: 500 }
    );
  }
} 