import { NextResponse } from 'next/server';
import hubspotClient, { withRetry } from '@/utils/hubspotClient';

export async function GET() {
  try {
    const response = await withRetry(() => hubspotClient.crm.contacts.basicApi.getPage(1));
    const contacts = response.results;

    const scenarios = new Map<string, number>();
    
    for (const contact of contacts) {
      const currentScenario = contact.properties.current_sequence;
      if (currentScenario) {
        scenarios.set(
          currentScenario,
          (scenarios.get(currentScenario) || 0) + 1
        );
      }
    }

    const result = {
      scenarios: Array.from(scenarios.entries()).map(([scenario, count]) => ({
        scenario,
        count,
      })),
      total: contacts.length,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 