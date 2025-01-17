import { NextResponse } from 'next/server';
import hubspotClient, { withRetry } from '@/utils/hubspotClient';

export async function GET() {
  try {
    const response = await withRetry(() => hubspotClient.crm.contacts.basicApi.getPage(1));
    const contacts = response.results;

    const responses = new Map<string, number>();
    
    for (const contact of contacts) {
      const scenariosRespondedTo = contact.properties.scenarios_responded_to;
      if (scenariosRespondedTo) {
        const scenarios = scenariosRespondedTo.split(';');
        for (const scenario of scenarios) {
          responses.set(
            scenario,
            (responses.get(scenario) || 0) + 1
          );
        }
      }
    }

    const result = {
      responses: Array.from(responses.entries()).map(([scenario, count]) => ({
        scenario,
        count,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching scenario responses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 