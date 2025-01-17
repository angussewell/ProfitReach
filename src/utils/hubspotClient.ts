import { Client } from '@hubspot/api-client';

if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
  throw new Error('HUBSPOT_PRIVATE_APP_TOKEN is required');
}

// Cache configuration
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Initialize the HubSpot client with the access token
const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN,
  defaultHeaders: {
    'User-Agent': 'hubspot-dashboard',
  },
  numberOfApiCallRetries: 3,
});

// Helper function to retry a request with exponential backoff and rate limiting
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 2000,
  cacheKey?: string
): Promise<T> {
  // Check cache first if cacheKey is provided
  if (cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`Returning cached data for ${cacheKey}`);
      return cached.data;
    }
  }

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await fn();

      // Cache the result if cacheKey is provided
      if (cacheKey) {
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        console.log(`Cached result for ${cacheKey}`);
      }

      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`API call failed (attempt ${attempt + 1}/${maxRetries}):`, error.message);
      
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '2', 10);
        console.log(`Rate limit hit, waiting ${retryAfter}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        delay = Math.min(delay * 2, 10000); // Cap at 10 seconds
        continue;
      }

      // For other errors, use exponential backoff
      delay = Math.min(delay * 2, 10000);

      // If it's the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Max retries reached');
}

// Add a helper method to get all contacts with pagination and rate limiting
async function getAllContacts() {
  const contacts = [];
  let after: string | undefined = undefined;
  let pageCount = 0;
  
  do {
    // Add delay between pages to respect rate limits
    if (pageCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const response = await withRetry(() => 
      hubspotClient.crm.contacts.basicApi.getPage(
        100,
        after,
        ['past_sequences', 'scenarios_responded_to', 'currently_in_scenario'],
        undefined,
        undefined,
        false
      ),
      3,
      2000,
      `contacts-page-${pageCount}`
    );
    
    contacts.push(...response.results);
    after = response.paging?.next?.after;
    pageCount++;
  } while (after);
  
  return contacts;
}

// Extend the client with our custom methods
const extendedClient = {
  ...hubspotClient,
  crm: {
    ...hubspotClient.crm,
    contacts: {
      ...hubspotClient.crm.contacts,
      getAll: getAllContacts,
      searchApi: hubspotClient.crm.contacts.searchApi,
      basicApi: hubspotClient.crm.contacts.basicApi,
    },
    companies: {
      ...hubspotClient.crm.companies,
      searchApi: hubspotClient.crm.companies.searchApi,
      basicApi: hubspotClient.crm.companies.basicApi,
    },
    properties: hubspotClient.crm.properties,
  },
  apiRequest: hubspotClient.apiRequest.bind(hubspotClient),
};

// Initialize validation on startup
withRetry(async () => {
  try {
    await Promise.all([
      hubspotClient.crm.contacts.basicApi.getPage(1),
      hubspotClient.crm.companies.basicApi.getPage(1),
    ]);
    console.log('[HubSpot] API access validated successfully');
  } catch (error: any) {
    console.error('[HubSpot] API access validation failed:', {
      status: error.response?.status,
      message: error.message,
    });
    throw error;
  }
}, 3, 2000, 'api-validation').catch(console.error);

export { extendedClient as hubspotClient };
export default hubspotClient;