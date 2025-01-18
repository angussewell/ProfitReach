import { NextResponse } from 'next/server';
import hubspotClient, { withRetry, withCache } from '@/utils/hubspotClient';

// Helper function to get scenario counts with caching
async function getScenarioCounts() {
  const cacheKey = 'scenario-counts';
  return withCache(cacheKey, 5 * 60 * 1000, async () => {
    try {
      const contacts = await hubspotClient.crm.contacts.getAll();
      
      // Count scenarios
      const scenarioCounts = new Map();
      for (const contact of contacts) {
        const pastSequences = contact.properties?.past_sequences?.split(',') || [];
        for (const sequence of pastSequences) {
          if (!sequence) continue;
          const count = scenarioCounts.get(sequence) || 0;
          scenarioCounts.set(sequence, count + 1);
        }
      }
      
      // Convert to array and sort by count
      const sortedScenarios = Array.from(scenarioCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      
      return sortedScenarios;
    } catch (error: any) {
      console.error('Error fetching scenario counts:', error);
      throw error;
    }
  });
}

export async function GET() {
  try {
    const scenarios = await getScenarioCounts();
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