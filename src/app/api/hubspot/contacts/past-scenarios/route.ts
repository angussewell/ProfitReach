import { NextResponse } from 'next/server';
import hubspotClient, { withRetry, withCache } from '@/utils/hubspotClient';

// Helper function to get scenario counts with caching
async function getScenarioCounts() {
  const cacheKey = 'scenario-counts';
  return withCache(cacheKey, 5 * 60 * 1000, async () => {
    try {
      const scenarioCounts = new Map<string, number>();
      let after: string | undefined;
      const limit = 100; // Process in batches of 100

      do {
        const response = await withRetry(() => 
          hubspotClient.crm.contacts.basicApi.getPage(limit, after, undefined, undefined, ['past_sequences'])
        );

        for (const contact of response.results) {
          const pastSequences = contact.properties?.past_sequences?.split(',') || [];
          for (const sequence of pastSequences) {
            if (!sequence) continue;
            const count = scenarioCounts.get(sequence) || 0;
            scenarioCounts.set(sequence, count + 1);
          }
        }

        after = response.paging?.next?.after;
      } while (after);

      // Convert to array and sort by count
      const sortedScenarios = Array.from(scenarioCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      return sortedScenarios;
    } catch (error: any) {
      console.error('Error fetching scenario counts:', error);
      return []; // Return empty array instead of throwing
    }
  });
}

export async function GET() {
  try {
    const scenarios = await getScenarioCounts();
    
    if (scenarios.length === 0) {
      return NextResponse.json(
        { message: 'No scenarios found or error occurred while fetching' },
        { status: 200 }
      );
    }

    return NextResponse.json(scenarios);
  } catch (error: any) {
    console.error('Error in past-scenarios GET:', error);
    
    // Handle rate limit errors
    if (error.response?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { error: 'Failed to fetch past scenarios' },
      { status: 500 }
    );
  }
} 