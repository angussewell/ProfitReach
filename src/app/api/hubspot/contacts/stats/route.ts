import { NextResponse } from 'next/server';
import hubspotClient, { withRetry } from '@/utils/hubspotClient';

export async function GET() {
  try {
    const response = await withRetry(() => hubspotClient.crm.contacts.basicApi.getPage(1));
    const contacts = response.results;

    let totalActive = 0;
    let totalCompleted = 0;
    let totalResponses = 0;

    for (const contact of contacts) {
      if (contact.properties.current_sequence) {
        totalActive++;
      }
      if (contact.properties.past_sequences) {
        totalCompleted++;
      }
      if (contact.properties.scenarios_responded_to) {
        totalResponses++;
      }
    }

    const overallResponseRate = totalCompleted > 0 
      ? (totalResponses / totalCompleted) * 100 
      : 0;

    return NextResponse.json({
      totalActive,
      totalCompleted,
      totalResponses,
      overallResponseRate: Math.round(overallResponseRate * 10) / 10,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    
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