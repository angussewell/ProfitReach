import { Client } from '@hubspot/api-client';
import pThrottle from 'p-throttle';

// Initialize the HubSpot client
const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
});

// Create a throttled fetch function that limits to 10 requests per second
const throttle = pThrottle({
  limit: 10,
  interval: 1000,
});

// Cache for API responses
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Wrapper for API calls with caching and rate limiting
async function withCache(key: string, ttl: number, fn: () => Promise<any>) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await fn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

// Retry logic with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  context = 'unknown'
): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await throttle(fn)();
    } catch (error: any) {
      lastError = error;
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response?.headers?.['retry-after'] || '1', 10);
        console.log(`Rate limit hit for ${context}, retry ${i + 1} in ${retryAfter}s`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Add a helper method to get all contacts with pagination and rate limiting
async function getAllContacts() {
  const cacheKey = 'all-contacts';
  return withCache(cacheKey, CACHE_TTL, async () => {
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
  });
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

export { withRetry, withCache };
export default extendedClient;