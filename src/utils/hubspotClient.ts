import { Client } from '@hubspot/api-client';

// Define error types for better handling
interface HubSpotError extends Error {
  status?: number;
  response?: {
    status: number;
    data: any;
    headers: Headers;
  };
}

// Define request configuration type
interface ApiRequestConfig {
  method: string;
  path: string;
  body?: any;
  queryParams?: Record<string, string>;
  maxRetries?: number;
  timeoutMs?: number;
  bypassCircuitBreaker?: boolean;
}

// Circuit breaker configuration
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const CIRCUIT_BREAKER = {
  maxFailures: 5,
  resetTimeout: 30000, // 30 seconds
  state: {
    failures: 0,
    lastFailure: 0,
    isOpen: false
  } as CircuitBreakerState
};

// Request tracking for rate limiting
interface RequestTracking {
  timestamp: number;
  endpoint: string;
}

const REQUEST_TRACKING = {
  requests: [] as RequestTracking[],
  maxRequestsPerSecond: 10,
  windowMs: 1000 // 1 second window
};

// Initialize the HubSpot client with aggressive settings
const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN,
  defaultHeaders: {
    'Content-Type': 'application/json',
    'User-Agent': 'HubspotDashboard/1.0',
  },
  numberOfApiCallRetries: 3,
});

// Helper function to validate token
const validateToken = (token: string | undefined): string => {
  if (!token) {
    throw new Error('HUBSPOT_PRIVATE_APP_TOKEN is not configured');
  }
  if (!token.startsWith('pat-na1-') || token.length < 40) {
    throw new Error('Invalid HubSpot token format');
  }
  return token;
};

// Helper function to check circuit breaker
const checkCircuitBreaker = () => {
  if (!CIRCUIT_BREAKER.state.isOpen) return true;
  
  const now = Date.now();
  if (now - CIRCUIT_BREAKER.state.lastFailure > CIRCUIT_BREAKER.resetTimeout) {
    // Reset circuit breaker after timeout
    CIRCUIT_BREAKER.state.isOpen = false;
    CIRCUIT_BREAKER.state.failures = 0;
    return true;
  }
  
  return false;
};

// Helper function to track request rate
const trackRequest = (endpoint: string): Promise<void> => {
  const now = Date.now();
  const windowStart = now - REQUEST_TRACKING.windowMs;
  
  // Remove old requests
  REQUEST_TRACKING.requests = REQUEST_TRACKING.requests.filter(
    req => req.timestamp > windowStart
  );
  
  // Check if we're over the limit
  if (REQUEST_TRACKING.requests.length >= REQUEST_TRACKING.maxRequestsPerSecond) {
    const oldestRequest = REQUEST_TRACKING.requests[0];
    const waitTime = REQUEST_TRACKING.windowMs - (now - oldestRequest.timestamp);
    return new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Add new request
  REQUEST_TRACKING.requests.push({ timestamp: now, endpoint });
  return Promise.resolve();
};

// Helper function to add query parameters to URL
const addQueryParams = (url: string, params?: Record<string, string>): string => {
  if (!params) return url;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, value);
  });
  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
};

// Helper function to handle timeouts
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

// Helper function for exponential backoff
const calculateBackoff = (attempt: number, baseDelay: number = 100): number => {
  const maxDelay = 5000; // 5 seconds maximum delay
  const jitter = Math.random() * 100; // Add randomness to prevent thundering herd
  return Math.min(Math.pow(2, attempt) * baseDelay + jitter, maxDelay);
};

// Helper function to force synchronous API calls with comprehensive error handling
export const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> => {
  let lastError: HubSpotError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const requestId = Math.random().toString(36).substring(7);
      console.log(`[${requestId}] API call attempt ${attempt}/${maxRetries}`, {
        timestamp: new Date().toISOString(),
        attempt,
        maxRetries,
        circuitBreakerState: CIRCUIT_BREAKER.state
      });

      const result = await fn();

      // Reset circuit breaker on success
      if (CIRCUIT_BREAKER.state.failures > 0) {
        CIRCUIT_BREAKER.state.failures = 0;
        CIRCUIT_BREAKER.state.isOpen = false;
      }

      console.log(`[${requestId}] API call successful`, {
        timestamp: new Date().toISOString(),
        attempt
      });

      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`API call failed (attempt ${attempt}/${maxRetries}):`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        timestamp: new Date().toISOString(),
        headers: error.response?.headers,
        circuitBreakerState: CIRCUIT_BREAKER.state
      });

      // Update circuit breaker
      CIRCUIT_BREAKER.state.failures++;
      CIRCUIT_BREAKER.state.lastFailure = Date.now();
      if (CIRCUIT_BREAKER.state.failures >= CIRCUIT_BREAKER.maxFailures) {
        CIRCUIT_BREAKER.state.isOpen = true;
      }

      // Check if we should retry based on error type
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = calculateBackoff(attempt);
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
};

// Helper function to determine if we should retry based on error
const shouldRetry = (error: HubSpotError): boolean => {
  // Don't retry if circuit breaker is open
  if (CIRCUIT_BREAKER.state.isOpen) return false;

  // Don't retry client errors except for rate limits
  if (error.status && error.status >= 400 && error.status < 500) {
    return error.status === 429; // Only retry rate limits
  }
  // Retry server errors and network issues
  return true;
};

// Direct API request function with improved error handling and validation
const apiRequest = async <T>({ 
  method, 
  path, 
  body, 
  queryParams = {},
  timeoutMs = 30000, // 30 second default timeout
  bypassCircuitBreaker = false
}: ApiRequestConfig): Promise<T> => {
  const baseUrl = 'https://api.hubapi.com';
  const token = validateToken(process.env.HUBSPOT_PRIVATE_APP_TOKEN);
  const requestId = Math.random().toString(36).substring(7);

  // Check circuit breaker unless bypassed
  if (!bypassCircuitBreaker && !checkCircuitBreaker()) {
    throw new Error('Circuit breaker is open');
  }

  // Track request rate
  await trackRequest(path);

  // Log request details for debugging
  console.log(`[${requestId}] Making HubSpot API request:`, {
    method,
    path,
    hasBody: !!body,
    queryParams,
    timestamp: new Date().toISOString(),
    circuitBreakerState: CIRCUIT_BREAKER.state,
    requestsInWindow: REQUEST_TRACKING.requests.length
  });

  // Remove any hapikey from query params if present
  delete queryParams.hapikey;

  const url = addQueryParams(`${baseUrl}${path}`, queryParams);
  
  try {
    const response = await withTimeout(
      fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'HubspotDashboard/1.0',
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
      timeoutMs
    );

    let responseData: any;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      console.error(`[${requestId}] HubSpot API error:`, {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString(),
        circuitBreakerState: CIRCUIT_BREAKER.state
      });

      const error = new Error(`HubSpot API error: ${response.status} ${response.statusText}`) as HubSpotError;
      error.status = response.status;
      error.response = {
        status: response.status,
        data: responseData,
        headers: response.headers
      };
      throw error;
    }

    // Log response summary for debugging
    console.log(`[${requestId}] HubSpot API response:`, {
      status: response.status,
      hasData: !!responseData,
      timestamp: new Date().toISOString(),
      rateLimit: {
        remaining: response.headers.get('x-hubspot-rpc-limit-remaining'),
        reset: response.headers.get('x-hubspot-rpc-limit-reset')
      },
      circuitBreakerState: CIRCUIT_BREAKER.state
    });

    return responseData as T;
  } catch (error: any) {
    console.error(`[${requestId}] Request failed:`, {
      error: error.message,
      timestamp: new Date().toISOString(),
      circuitBreakerState: CIRCUIT_BREAKER.state
    });
    throw error;
  }
};

// Extend the client with aggressive retry logic and direct API access
const extendedClient = {
  ...hubspotClient,
  apiRequest: <T>(config: ApiRequestConfig): Promise<T> => 
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