## Authentication and Rate Limits

Private apps require Bearer token authentication using the format:
```typescript
const headers = {
  'Authorization': 'Bearer pat-na1-YOUR-TOKEN',
  'Content-Type': 'application/json'
};
```

Rate limits vary by subscription tier[18]:
- Free/Starter: 100 requests/10 seconds
- Professional/Enterprise: 150 requests/10 seconds
- API Add-on: 200 requests/10 seconds

## Contact Management

### Querying Multi-Checkbox Properties
```typescript
const searchRequest = {
  filterGroups: [{
    filters: [{
      propertyName: "custom_checkbox_field",
      operator: "IN", 
      values: ["value1", "value2"]
    }]
  }],
  properties: ["email", "custom_checkbox_field"],
  limit: 100
};
```

### Pagination Best Practices
```typescript
async function getAllContacts() {
  const contacts = [];
  let after = undefined;
  
  while (true) {
    const response = await client.crm.contacts.basicApi.getPage(
      100, // Maximum allowed per page
      after,
      undefined,
      undefined,
      properties
    );
    
    contacts.push(...response.results);
    
    if (!response.paging?.next?.after) {
      break;
    }
    after = response.paging.next.after;
    
    // Implement rate limiting delay
    await sleep(100); 
  }
  return contacts;
}
```

## Rate Limit Handling

Implement exponential backoff for rate limit handling[29]:
```typescript
async function makeApiRequest(fn: () => Promise<any>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

## Lifecycle Stage Management

Query companies by lifecycle stage:
```typescript
const searchRequest = {
  filterGroups: [{
    filters: [{
      propertyName: "lifecyclestage",
      operator: "EQ",
      value: "marketingqualifiedlead"
    }]
  }],
  properties: ["name", "lifecyclestage"],
  limit: 100
};
```

**Important Notes:**
- The search endpoints are limited to 10,000 total results[12]
- Lifecycle stages cannot move backward without first clearing the value[64]
- Custom lifecycle stages must be created through the UI before being used via API[4]

## Performance Optimization

1. Use batch operations when possible (up to 100 records per request)[18]
2. Cache frequently accessed data
3. Implement request queuing to stay within rate limits
4. Use the GraphQL API for complex queries requiring multiple properties[55]

## Recent Changes

- API key authentication is being sunset - migrate to private app tokens[5]
- New batch read limit of 1000 IDs per request effective February 2025[8]
- Custom lifecycle stages are now fully supported[4]

## Error Handling

Monitor response headers for rate limit information:
- X-HubSpot-RateLimit-Max
- X-HubSpot-RateLimit-Remaining
- X-HubSpot-RateLimit-Reset

## Additional API Implementation Details

### Batch Operations
```typescript
const batchApiClient = new BatchApiClient({
  maxConcurrent: 3,
  rateLimitDelay: 100,
  maxRetries: 3
});

async function batchUpdateContacts(contacts: Contact[]) {
  return batchApiClient.post('contacts/v1/contact/batch/', {
    body: contacts.map(contact => ({
      properties: [
        { property: 'email', value: contact.email },
        { property: 'firstname', value: contact.firstname }
      ]
    }))
  });
}
```

### GraphQL Support
```graphql
query GetContactDetails {
  CRM {
    contacts(limit: 10) {
      items {
        id
        properties {
          email
          firstname
          lastname
          custom_checkbox_field
        }
      }
    }
  }
}
```

### Search API Optimization
```typescript
const searchRequest = {
  filterGroups: [{
    filters: [{
      propertyName: "custom_checkbox_field",
      operator: "CONTAINS_TOKEN",
      value: "value1"
    }]
  }],
  sorts: [{
    propertyName: "createdate",
    direction: "DESCENDING"
  }],
  properties: ["email", "custom_checkbox_field"],
  limit: 100
};
```

## Advanced Error Handling

**Status Code Handling:**
```typescript
class HubSpotError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public correlationId?: string
  ) {
    super(message);
  }

  isRateLimit(): boolean {
    return this.status === 429;
  }

  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}
```

## Performance Optimizations

**Caching Implementation:**
```typescript
class HubSpotCache {
  private cache = new Map<string, {
    data: any,
    timestamp: number
  }>();

  get(key: string, ttl: number): any {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

## Recent API Changes

- New batch operation size increased to 200 objects for Enterprise accounts[5]
- GraphQL API now supports custom object queries[8]
- New rate limiting headers provide more granular control[11]
- Webhook delivery now includes retry attempts with exponential backoff[9]

## Security Best Practices

- Store tokens in environment variables only
- Implement IP whitelisting for API access
- Use webhook signatures for verification
- Rotate private app tokens every 90 days[7]

## Monitoring and Debugging

**Request Tracking:**
```typescript
class RequestTracker {
  private requests: Map<string, number> = new Map();

  track(endpoint: string): void {
    const count = this.requests.get(endpoint) || 0;
    this.requests.set(endpoint, count + 1);
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.requests);
  }
}
```