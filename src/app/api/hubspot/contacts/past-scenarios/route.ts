import { NextResponse } from 'next/server';
import hubspotClient, { withRetry, withCache } from '@/utils/hubspotClient';

// Force dynamic to prevent static page generation timeout
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to get scenario counts with caching
async function getScenarioCounts() {
  const cacheKey = 'scenario-counts';
  return withCache(cacheKey, 5 * 60 * 1000, async () => {
    try {
      const scenarioCounts = new Map<string, number>();
      let after = '0';
      const limit = 10; // Reduce batch size to avoid rate limits
      let retries = 0;
      const maxRetries = 3;

      const processPage = async () => {
        while (retries < maxRetries) {
          try {
            return await hubspotClient.crm.contacts.searchApi.doSearch({
              filterGroups: [],
              properties: ['past_sequences'],
              limit,
              after,
              sorts: []
            });
          } catch (error: any) {
            if (error.response?.status === 429) {
              retries++;
              if (retries === maxRetries) throw error;
              
              // Wait with exponential backoff
              const delay = Math.pow(2, retries) * 1000;
              console.log(`Rate limited, waiting ${delay}ms before retry ${retries}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw error;
          }
        }
        throw new Error('Max retries reached');
      };

      do {
        // Add delay between pages to avoid rate limits
        if (after !== '0') {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const response = await processPage();

        for (const contact of response.results) {
          const pastSequences = contact.properties?.past_sequences?.split(',') || [];
          for (const sequence of pastSequences) {
            if (!sequence) continue;
            const count = scenarioCounts.get(sequence) || 0;
            scenarioCounts.set(sequence, count + 1);
          }
        }

        after = response.paging?.next?.after || '';
        if (!after) break;
        
        // Reset retries for next page
        retries = 0;
      } while (true);

      // Convert to array and sort by count
      const sortedScenarios = Array.from(scenarioCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      return sortedScenarios;
    } catch (error: any) {
      console.error('Error fetching scenario counts:', error);
      
      if (error.response?.status === 429) {
        // Return empty array on rate limit, letting the endpoint handle cached data
        return [];
      }
      
      throw error;
    }
  });
}

export async function GET() {
  try {
    const scenarios = await getScenarioCounts();
    
    if (scenarios.length === 0) {
      // Try to get cached data
      const cached = await withCache('scenario-counts', 0, async () => null);
      if (cached) {
        console.log('Returning cached scenario data');
        return NextResponse.json(cached);
      }
      
      return NextResponse.json(
        { message: 'No scenarios found or error occurred while fetching' },
        { status: 200 }
      );
    }

    return NextResponse.json(scenarios);
  } catch (error: any) {
    console.error('Error in past-scenarios GET:', error);
    
    // Try to get cached data on error
    const cached = await withCache('scenario-counts', 0, async () => null);
    if (cached) {
      console.log('Error occurred, returning cached data');
      return NextResponse.json(cached);
    }
    
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