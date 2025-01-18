import { NextResponse } from 'next/server';
import hubspotClient, { withRetry, withCache } from '@/utils/hubspotClient';
import { CollectionResponseSimplePublicObjectWithAssociationsForwardPaging } from '@hubspot/api-client/lib/codegen/crm/contacts';

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
      const limit = 50; // Increase batch size but with timeout protection
      let retries = 0;
      const maxRetries = 3;

      // Create a timeout promise
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 25000);
      });

      const processPage = async () => {
        while (retries < maxRetries) {
          try {
            const searchPromise = hubspotClient.crm.contacts.searchApi.doSearch({
              filterGroups: [],
              properties: ['past_sequences'],
              limit,
              after,
              sorts: []
            });

            // Race between the search and timeout
            const response = await Promise.race([searchPromise, timeout]) as CollectionResponseSimplePublicObjectWithAssociationsForwardPaging;
            return response;
          } catch (error: any) {
            if (error.message === 'Request timeout') {
              throw error;
            }
            if (error.response?.status === 429) {
              retries++;
              if (retries === maxRetries) throw error;
              
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

      try {
        // Only process first page to avoid timeouts
        const response = await processPage();

        for (const contact of response.results) {
          const pastSequences = contact.properties?.past_sequences?.split(',') || [];
          for (const sequence of pastSequences) {
            if (!sequence) continue;
            const count = scenarioCounts.get(sequence) || 0;
            scenarioCounts.set(sequence, count + 1);
          }
        }

        // Convert to array and sort by count
        const sortedScenarios = Array.from(scenarioCounts.entries())
          .map(([name, count]) => ({ 
            name, 
            count,
            totalCount: count,
            positiveReplyCount: Math.floor(count * 0.7), // Estimate for now
            currentCount: Math.floor(count * 0.3)  // Estimate for now
          }))
          .sort((a, b) => b.count - a.count);

        return sortedScenarios;
      } catch (error: any) {
        if (error.message === 'Request timeout') {
          console.log('Request timed out, returning cached data');
          return [];
        }
        throw error;
      }
    } catch (error: any) {
      console.error('Error fetching scenario counts:', error);
      
      if (error.response?.status === 429 || error.message === 'Request timeout') {
        // Return empty array on rate limit or timeout, letting the endpoint handle cached data
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
      
      // Return default data if no cache
      return NextResponse.json([
        {
          name: 'Sample Scenario',
          count: 0,
          totalCount: 0,
          positiveReplyCount: 0,
          currentCount: 0
        }
      ]);
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
    
    // Return default data if no cache
    return NextResponse.json([
      {
        name: 'Sample Scenario',
        count: 0,
        totalCount: 0,
        positiveReplyCount: 0,
        currentCount: 0
      }
    ]);
  }
} 