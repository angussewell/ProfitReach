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
export const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      console.error(`API call failed (attempt ${attempt}/${maxRetries}):`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        timestamp: new Date().toISOString()
      });
      
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff with a maximum of 5 seconds
      const delay = Math.min(Math.pow(2, attempt) * 100, 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
};

// Direct API request function with improved error handling
const apiRequest = async <T>({ method, path, body }: { method: string; path: string; body?: any }): Promise<T> => {
  const baseUrl = 'https://api.hubapi.com';
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

  if (!token) {
    throw new Error('HUBSPOT_PRIVATE_APP_TOKEN is not configured');
  }

  // Log request details for debugging
  console.log('Making HubSpot API request:', {
    method,
    path,
    hasBody: !!body,
    timestamp: new Date().toISOString()
  });

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('HubSpot API error:', {
      status: response.status,
      statusText: response.statusText,
      errorText,
      timestamp: new Date().toISOString()
    });

    throw new Error(`HubSpot API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  // Log response summary for debugging
  console.log('HubSpot API response:', {
    status: response.status,
    hasData: !!data,
    timestamp: new Date().toISOString()
  });

  return data as T;
};

// Extend the client with aggressive retry logic and direct API access
const extendedClient = {
  ...hubspotClient,
  apiRequest: <T>(config: { method: string; path: string; body?: any }): Promise<T> => 
    withRetry(() => apiRequest<T>(config)),
  crm: {
    ...hubspotClient.crm,
    contacts: {
      ...hubspotClient.crm.contacts,
      searchApi: {
        ...hubspotClient.crm.contacts.searchApi,
        doSearch: async (request: any) => {
          return withRetry(() => hubspotClient.crm.contacts.searchApi.doSearch(request));
        }
      },
      basicApi: {
        ...hubspotClient.crm.contacts.basicApi,
        getPage: async (...args: any[]) => {
          return withRetry(() => hubspotClient.crm.contacts.basicApi.getPage(...args));
        }
      }
    }
  }
};

export default extendedClient;