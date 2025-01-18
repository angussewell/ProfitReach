import pThrottle from 'p-throttle';

// Create a throttled fetch function that limits to 10 requests per second
const throttledFetch = pThrottle({
  limit: 10,
  interval: 1000,
})(fetch);

export async function hubspotFetch(url: string, options: RequestInit = {}) {
  const baseUrl = 'https://api.hubapi.com';
  const headers = {
    'Authorization': `Bearer ${process.env.HUBSPOT_PRIVATE_APP_TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await throttledFetch(`${baseUrl}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Wait for 1 second and retry once
        await new Promise(resolve => setTimeout(resolve, 1000));
        return hubspotFetch(url, options);
      }
      throw new Error(`HubSpot API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('HubSpot API request failed:', error);
    throw error;
  }
} 