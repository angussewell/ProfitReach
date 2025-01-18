import { Client } from '@hubspot/api-client';

// Initialize the HubSpot client with aggressive settings
const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN,
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
  numberOfApiCallRetries: 3,
});

// Helper function to force synchronous API calls
async function forceSyncApiCall<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      console.error(`API call failed (attempt ${attempt}/${maxRetries}):`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff with a maximum of 5 seconds
      const delay = Math.min(Math.pow(2, attempt) * 100, 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Extend the client with aggressive retry logic
const extendedClient = {
  ...hubspotClient,
  crm: {
    ...hubspotClient.crm,
    contacts: {
      ...hubspotClient.crm.contacts,
      searchApi: {
        ...hubspotClient.crm.contacts.searchApi,
        doSearch: async (request: any) => {
          return forceSyncApiCall(() => hubspotClient.crm.contacts.searchApi.doSearch(request));
        }
      },
      basicApi: {
        ...hubspotClient.crm.contacts.basicApi,
        getPage: async (...args: any[]) => {
          return forceSyncApiCall(() => hubspotClient.crm.contacts.basicApi.getPage(...args));
        }
      }
    }
  }
};

export default extendedClient;