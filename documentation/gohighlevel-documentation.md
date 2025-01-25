## OAuth 2.0 Implementation

**Authorization Flow**
The OAuth 2.0 flow in GoHighLevel follows these steps:

1. Authorization Request
- Direct users to GoHighLevel's authorization server
- Include Client ID, requested scopes, and redirect URL
- Use the endpoint: `https://services.leadconnectorhq.com/oauth/token`[1]

2. User Consent
- User reviews and approves requested permissions
- Redirected to provided redirect URL with authorization code[1]

3. Token Exchange
- Exchange authorization code for access token
- Include authorization code, Client ID, Client Secret in POST request
- Store received tokens securely[1]

## Token Management

**Access Tokens**
- Required for all authenticated API requests
- Include in Authorization header
- Limited lifetime of 24 days[9]
- Used for making authenticated API requests to GoHighLevel resources[1]

**Refresh Tokens**
- Used to obtain new access tokens without reauthorization
- Important considerations:
  - Expires immediately after single use
  - Must wait 8 seconds between refresh token calls
  - Invalid token errors may occur if called too quickly[4]

## Rate Limits

**API v2.0 Limits**
- Burst limit: 100 requests per 10 seconds per Marketplace app per resource
- Applied separately for Location and Company resources[5]

**Best Practices**
- Implement exponential backoff for 429 responses
- Use pagination for large data requests
- Avoid polling by using webhooks for updates[7]

## Scopes and Permissions

**Access Types**
- Company (Agency Plan): Required for agency-level operations
- Location: For location-specific operations
- Sub-account: For managing sub-account operations[8]

**Token Generation**
- Agency-level tokens can create sub-account tokens
- Sub-account tokens inherit similar scopes as agency-level token
- Requires 'oauth.write' and 'oauth.readonly' scopes[3]

## Implementation Example

```javascript
// Authorization endpoint setup
const authEndpoint = 'https://services.leadconnectorhq.com/oauth/token';
const redirectUri = 'http://your-domain.com/OAuth/callback/gohighlevel';

// Token exchange request
const tokenRequest = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client_id: YOUR_CLIENT_ID,
    client_secret: YOUR_CLIENT_SECRET,
    code: AUTH_CODE,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  })
};
```

## Security Considerations

- Store tokens securely in encrypted storage
- Never expose Client Secret in client-side code
- Implement proper error handling for token expiration
- Use HTTPS for all API communications
- Regularly rotate refresh tokens[1]

## Error Handling

- Handle 429 (Too Many Requests) responses
- Implement retry logic with exponential backoff
- Monitor token expiration and refresh cycles
- Validate token responses before storage
- Handle invalid token errors during refresh attempts[4]

## Contact Management in GoHighLevel API v2.0

**Contact Creation and Updates**
The base endpoint for contact operations is `https://services.leadconnectorhq.com/contacts/`[11]. Contacts can be created and updated through the following operations:

- POST request for new contacts
- PUT request for updating existing contacts
- Required fields must include either email or phone number[27]

**Standard Contact Fields**
Core contact properties include:
- First Name
- Last Name
- Email
- Phone
- Business Name
- Source
- Contact Type
- Country
- Street Address[21]

**Custom Fields Implementation**
Custom fields can be managed through:
- Creating custom field folders for organization
- Adding single line or dropdown option fields
- Rearranging fields between folders
- Field deletion and management capabilities[34]

## Contact Operations

**Bulk Actions**
Rate limits for bulk operations:
- 60,000 contacts processed per hour for immediate actions
- Drip mode limitations:
  - 1,000 messages/minute (30sec-1min frequency)
  - 4,999 messages/minute (5min frequency)
  - 5,000 messages/minute (6-10min frequency)
  - 10,000 messages/minute (>10min frequency)[31]

**Contact Search and Filtering**
Filtering capabilities include:
- AND/OR conditions for complex queries
- Email status filtering (Sent, Delivered, Opened, Clicked)
- Date-based filtering
- Campaign and workflow-based filtering[37]

**Tag Management**
Tags functionality includes:
- Creating and managing tags for contact organization
- Using tags for automation triggers
- Bulk tag operations
- Tag-based workflow automation[3]

## API Implementation Example

```javascript
// Create/Update Contact
const contactEndpoint = 'https://services.leadconnectorhq.com/contacts/';
const contactData = {
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "+1234567890",
  customFields: {
    cf_1: "Custom Value",
    cf_2: "Another Value"
  },
  tags: ["lead", "website"]
};

// API Request Configuration
const config = {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(contactData)
};
```

## Field Validation Rules

- Email or phone number is mandatory for contact creation[27]
- Custom fields must be properly mapped with correct field IDs[1]
- Field values must match specified data types
- Tags must exist before being assigned to contacts

## Campaign & Sequence Management in GoHighLevel API v2.0

**Base URL**: `https://services.leadconnectorhq.com/`

## Automation Workflows

**Creating Sequences**
```javascript
// Create new workflow
const createWorkflow = {
  method: 'POST',
  url: '/workflows',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  },
  body: {
    name: "New Lead Sequence",
    description: "Automated sequence for new leads",
    trigger: {
      type: "CONTACT_CREATED",
      filters: []
    }
  }
};
```

**Workflow Settings**
- Allow re-entry: Controls if contacts can enter workflow multiple times
- Stop on response: Ends workflow if contact responds to any message[11]
- Advanced window: Specify time frames for action execution (e.g., Mon-Fri 9am-5pm)[21]

## Sequence Steps Configuration

**Wait Actions**
- Time delay: Fixed duration pauses
- Event/Appointment time: Schedule-based delays
- Condition: Wait for specific criteria
- Contact reply: Pause until response received
- Trigger link clicked: Wait for link interaction[21][23]

**Conditional Logic Implementation**
```javascript
// Add If/Else condition
const addCondition = {
  type: "IF_ELSE",
  conditions: [{
    field: "tags",
    operator: "CONTAINS",
    value: "qualified"
  }],
  positive_path: [], // Actions if condition true
  negative_path: []  // Actions if condition false
};
```

## Communication Channels

**Email Integration**
```javascript
// Send email action
const emailAction = {
  method: 'POST',
  url: '/communications/emails',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
  },
  body: {
    subject: "Welcome to Our Service",
    body: "Hello {{contact.firstName}},",
    templateId: "template_id",
    from: {
      email: "sender@domain.com",
      name: "Sender Name"
    }
  }
};
```

**SMS Capabilities**
```javascript
// Send SMS action
const smsAction = {
  method: 'POST',
  url: '/communications/sms',
  body: {
    phoneNumber: "{{contact.phone}}",
    message: "Your appointment is confirmed",
    mediaUrl: "optional_media_url"
  }
};
```

**Voice Call Integration**
- Call connect feature supports:
  - Voicemail detection
  - Time window settings
  - Call timeout configuration
  - Whisper messages[25]

## Template Management

**Email Templates**
```javascript
// Create email template
const createTemplate = {
  method: 'POST',
  url: '/templates/emails',
  body: {
    name: "Welcome Email",
    subject: "Welcome to {{business.name}}",
    body: "HTML_CONTENT",
    category: "onboarding"
  }
};
```

**Workflow Actions Available**[15]
- External Communications:
  - Send Email
  - Send SMS
  - Call
  - Voicemail
  - Messenger
  - Instagram DM
  - Manual SMS
  - Manual Call
  - GMB Messaging

- CRM Actions:
  - Add/Remove Contact Tag
  - Create/Update Opportunity
  - Add To Notes
  - Assign To User
  - Set Event Start Date
  - Add/Remove From Workflow
  - Send Internal Notification
  - Set Contact DND
  - Send Review Request
  - Add Task

## Advanced Features

**Marketplace Workflow Actions**[18]
- Custom actions for API integration
- Payload format for triggers:
```javascript
{
  "triggerData": {
    "id": "trigger_id",
    "key": "trigger_key",
    "filters": [],
    "eventType": "CREATED",
    "targetUrl": "webhook_url"
  },
  "meta": {
    "key": "trigger_key",
    "version": "2.4"
  }
}
```

**Rate Limits**
- Bulk operations: 60,000 contacts per hour for immediate actions
- Drip mode limitations:
  - 1,000 messages/minute (30sec-1min frequency)
  - 4,999 messages/minute (5min frequency)
  - 5,000 messages/minute (6-10min frequency)
  - 10,000 messages/minute (>10min frequency)[1]

## Webhook Implementation

**Available Events**
- Inbound webhooks can be triggered by contact creation, updates, and custom events[1]
- Premium triggers allow for custom payload structures and advanced event handling[20]
- Events can be configured through the workflow builder for real-time data exchange[1]

**Payload Structure & Handling**
```javascript
{
  "contact": {
    "firstName": "{{contact.first_name}}",
    "lastName": "{{contact.last_name}}",
    "email": "{{contact.email}}",
    "phone": "{{contact.phone}}"
  },
  "customFields": {
    "field1": "value1"
  }
}
```

**Error Management & Retry Logic**
- Failed webhook executions trigger exponential backoffs for retries[20]
- Rate limits: 100 requests per 10 seconds per resource[4]
- Daily limit: 200,000 requests per day[4]
- Webhook.site can be used for troubleshooting API requests and payload validation[18]

## Location & Business Management

**Location Hierarchy**
- Agency level manages multiple locations through a centralized dashboard[23]
- Each location operates as a separate sub-account with its own settings and data[26]
- LocationId serves as the primary identifier for all API operations[26]

**Permission Structure**
| Role | Access Level |
|------|--------------|
| Agency Admin | Full access across all locations |
| Agency User | Configurable access per location |
| Account Admin | Location-specific full access |
| Account User | Limited location access |
[23][25]

**Data Segregation**
- Each location maintains separate:
  - Contact databases
  - Campaign settings
  - Workflows
  - Calendar appointments[24]
- Custom field mapping can be configured per location[13]

**Cross-Location Operations**
- Agency-level tokens can manage multiple locations[4]
- Centralized reporting and dashboard views available for agency admins[23]
- Multi-location businesses require careful consideration of resource allocation and management[26]

## Pipeline Management in GoHighLevel

**Pipeline Structure**
Pipeline management in GoHighLevel allows for customizable stages that track opportunities from initial contact to deal closure[1]. Each pipeline can be configured with:
```javascript
// Pipeline creation example
const pipeline = {
  name: "Sales Pipeline",
  stages: [
    "New Lead",
    "Responded",
    "Call Booked",
    "Under Contract",
    "Client",
    "Ghosted"
  ],
  status: ["Open", "Won", "Lost", "Abandoned"]
};
```

**Opportunity Management**
Opportunities can be created and managed through:
- Manual creation in the dashboard
- Automated triggers from form submissions
- API integrations
- Bulk imports via CSV[11]

**Stage Transitions**
```javascript
// Example of moving an opportunity
const moveOpportunity = {
  method: 'POST',
  url: '/opportunities/move',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
  },
  body: {
    opportunityId: "opp_id",
    stageId: "new_stage_id",
    pipelineId: "pipeline_id"
  }
};
```

## Reporting & Analytics

**Custom Report Generation**
Reports can be created and scheduled with the following features[4]:
- Customizable cover pages
- Widget-based dashboards
- Automated scheduling
- PDF export capabilities
- Email distribution

**Performance Metrics**
Key metrics available through the analytics dashboard[7]:
- Reports generated
- Leads generated
- Total conversions
- Prospect engagement
- Form submission tracking

**Campaign Analytics**
Dashboard metrics include[6]:
- Channel performance breakdown
- Audience engagement rates
- Funnel stage conversion rates
- ROI tracking
- A/B test results

**Agent Reporting**
Detailed agent performance tracking includes[15]:
- Opportunity conversion rates
- SMS and email statistics
- Call metrics
- Sales efficiency metrics
- Pipeline-specific conversion data

**API Integration for Reporting**
```javascript
// Example of retrieving pipeline metrics
const getPipelineMetrics = {
  method: 'GET',
  url: '/reporting/pipeline-metrics',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
  },
  params: {
    startDate: '2025-01-01',
    endDate: '2025-01-25',
    pipelineId: 'pipeline_id'
  }
};
```

**Advanced Analytics Features**
- Real-time dashboard updates
- Comparative period analysis
- Custom date range selection
- Multi-pipeline tracking
- Export capabilities to CSV and PDF[14]

**Automation Integration**
Pipeline stages can trigger automated workflows[8]:
- Email sequences
- SMS notifications
- Task assignments
- Invoice generation
- Follow-up scheduling

## Error Handling in GoHighLevel API

**Common Error Codes**
- 429: Rate limit exceeded
- 401: Authentication error
- 403: Permission denied
- 404: Resource not found
- 500: Internal server error

**Rate Limit Specifications**
- Burst limit: 100 requests per 10 seconds per resource[5]
- Daily limit: 200,000 requests[5]
- Separate limits for Location and Company resources

## Implementation Example

```javascript
// Retry strategy implementation
const retryConfig = {
  retries: 3,
  factor: 2,
  minTimeout: 1000, // 1 second
  maxTimeout: 5000, // 5 seconds
  randomize: true
};

async function makeAPIRequest(endpoint, options) {
  try {
    const response = await fetch(endpoint, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      await delay(retryAfter * 1000);
      return makeAPIRequest(endpoint, options);
    }
    
    return response;
  } catch (error) {
    console.error(`API Error: ${error.message}`);
    throw error;
  }
}
```

## Retry Strategy Best Practices

**Exponential Backoff Implementation**
- Start with 1-second delay
- Double delay after each retry
- Add randomization (jitter)
- Maximum of 3 retry attempts[3]
- Delay range: 1-5 seconds[3]

**Anti-Patterns to Avoid**
- Never retry indefinitely
- Avoid immediate retries
- Prevent retry amplification across multiple levels[3]

## Debugging Tools

**Webhook.site Integration**
- Use for API request troubleshooting
- Captures raw payload data
- Helps validate webhook configurations[10]

**Error Logging Requirements**
```javascript
// Example logging implementation
const logError = (error, context) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    errorCode: error.code,
    message: error.message,
    endpoint: context.endpoint,
    requestId: context.requestId,
    payload: context.payload
  };
  
  // Store error log
  storeErrorLog(errorLog);
};
```

## Response Validation

**Success Response Structure**
```javascript
{
  success: true,
  data: {
    // Response data
  },
  meta: {
    timestamp: "2025-01-25T15:00:00Z",
    requestId: "req_123456"
  }
}
```

**Error Response Structure**
```javascript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human readable error message",
    details: {
      // Additional error context
    }
  },
  meta: {
    timestamp: "2025-01-25T15:00:00Z",
    requestId: "req_123456"
  }
}
```

## Rate Limit Headers
```javascript
// Example rate limit headers
{
  'X-RateLimit-Limit': '100',
  'X-RateLimit-Remaining': '95',
  'X-RateLimit-Reset': '1706198400',
  'Retry-After': '60'
}
```

**Monitoring and Alerts**
- Track rate limit usage
- Set up alerts for approaching limits
- Monitor error rates and patterns
- Log all API responses for debugging
- Implement circuit breakers for failing endpoints

## Security & Compliance in GoHighLevel

**Data Encryption Standards**
All data in GoHighLevel is protected using industry-standard encryption:
- TLS 1.2 or 1.3 with 2,048-bit keys for data in transit[5]
- AES-256 encryption for platform data at rest[5]
- Password hashing following industry best practices[5]

## Access Control Implementation

**Token Management**
```javascript
// Example of token rotation implementation
const rotateToken = {
  method: 'POST',
  url: '/oauth/token/rotate',
  headers: {
    'Authorization': 'Bearer YOUR_CURRENT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: {
    integration_id: 'your_integration_id',
    expire_type: 'now' // or 'later'
  }
};
```

**Permission Levels**
| Role | Access Scope |
|------|-------------|
| Agency Admin | Full system access |
| Account Admin | Location-specific access |
| Account User | Limited feature access |
| API Integration | Scope-restricted access |

## Audit Logging

**Trackable Events**
- User logins and authentication attempts
- Contact modifications
- Campaign changes
- API access events
- System configuration updates[2]

**Audit Log Implementation**
```javascript
// Fetch audit logs
const auditLogs = {
  method: 'GET',
  url: '/audit-logs',
  params: {
    startDate: '2025-01-01',
    endDate: '2025-01-25',
    action: 'created,updated,deleted',
    module: 'contacts,opportunities,tasks'
  }
};
```

## Security Best Practices

**API Integration Security**
- Implement rate limiting (100 requests per 10 seconds per resource)[1]
- Use private integrations for enhanced security[8]
- Rotate access tokens every 24 days[14]
- Store tokens in encrypted storage
- Use HTTPS for all API communications

**Access Restrictions**
High-risk actions are restricted for security:
- Domain/SSO setting changes
- User data exports
- API key management
- CRM data imports
- Contact/company deletions[5]

**Monitoring and Protection**
- Firewall and application security for all customer content
- OWASP Top 10 compliance
- DDoS protection implementation
- Automated vulnerability scanning
- Regular penetration testing[7]

## Multi-Factor Authentication
- Required for company network access
- Password policies follow industry standards
- Password vault implementation with RBAC
- Automated security management tools[5]

## Integration Testing for GoHighLevel API

**Authentication Testing**
```javascript
// OAuth token validation
const validateAuth = {
  method: 'GET',
  url: '/oauth/validate',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Version': '2021-07-28'
  }
};
```

**CRUD Operations Testing**
```javascript
// Contact creation test
const createContact = {
  method: 'POST',
  url: '/contacts',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Version': '2021-07-28',
    'Content-Type': 'application/json'
  },
  body: {
    locationId: 'your_location_id',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com'
  }
};

// Contact retrieval test
const getContact = {
  method: 'GET',
  url: `/contacts/${contactId}`,
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Version': '2021-07-28'
  }
};
```

## Webhook Testing

**Webhook.site Implementation**
1. Set up webhook endpoint at Webhook.site[1]
2. Replace GoHighLevel endpoint with test URL
3. Execute test events
4. Analyze payload structure and headers[2]

**Rate Limit Validation**
Monitor response headers for limits[5]:
```javascript
{
  'X-RateLimit-Limit-Daily': 'daily_limit',
  'X-RateLimit-Daily-Remaining': 'remaining_calls',
  'X-RateLimit-Reset': 'reset_timestamp'
}
```

## Error Scenario Testing

**Common Error Cases**
- 401: Invalid authentication
- 429: Rate limit exceeded
- 400: Invalid request payload
- 404: Resource not found

**Error Response Validation**
```javascript
// Example error response structure
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Detailed error message',
    details: {
      field: 'Additional context'
    }
  }
}
```

**Version Header Testing**
```javascript
// Required version header format
headers: {
  'Version': '2021-07-28',
  'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
}
```

## Integration Test Suite

**Test Categories**
- Authentication flows
- Contact management
- Pipeline operations
- Webhook reliability
- Rate limit handling
- Error responses
- Data validation

**Performance Testing**
- Burst limit compliance (100 requests/10 seconds)
- Daily limit monitoring
- Response time tracking
- Webhook delivery reliability

Here's a message for Cursor about implementing OAuth flow for a private app:

```markdown
Hey, we're using this private app. This is what you need to do to make OAuth flow work:

## Environment Setup
Create a `.env.local` file with these variables:
```
AUTH0_SECRET='your_secret'
AUTH0_ID='your_client_id'
AUTH0_DOMAIN='your_domain'
NEXTAUTH_SECRET='generated_secret'
```

## Implementation Steps

1. Install required dependencies:
```
npm install next-auth @auth0/nextjs-auth0
```

2. Create the auth route handler in `src/app/api/auth/[auth0]/route.ts`:
```
import { handleAuth } from '@auth0/nextjs-auth0';
export const GET = handleAuth();
```

3. Set up the OAuth provider configuration:
```
import NextAuth from 'next-auth';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [{
    id: "your_provider",
    name: "Your Provider",
    type: "oauth",
    version: "2.0",
    scope: "your_scopes",
    params: { grant_type: "authorization_code" },
    authorization: {
      url: "your_auth_url",
      params: {
        client_id: process.env.CLIENT_ID,
        scope: "your_scopes",
        redirect_uri: "your_callback_url",
      },
    },
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
  }]
})
```

4. For API calls, use access tokens:
```
import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';

export default withApiAuthRequired(async function apiRoute(req, res) {
  try {
    const { accessToken } = await getAccessToken(req, res);
    // Use accessToken for API calls
  } catch(error) {
    res.status(error.status || 500).end(error.message)
  }
});
```

## Security Notes
- Store all sensitive credentials in environment variables
- Implement proper error handling for auth failures
- Use PKCE flow for added security
- Keep refresh tokens server-side only
- Implement proper session management

The private app status doesn't affect the OAuth implementation - the flow remains the same. Just ensure all credentials and redirect URIs match what's configured in the OAuth provider dashboard.
```

Let me explain the correct OAuth2 implementation sequence for GoHighLevel's API v2.0 and help resolve your specific errors.

## OAuth2 Authorization Flow

**Authorization Sequence**
1. Direct users to the authorization URL with required parameters:
```javascript
const authUrl = 'https://marketplace.leadconnectorhq.com/oauth/authorize'
const params = {
  client_id: YOUR_CLIENT_ID,
  redirect_uri: 'http://localhost:3000/api/auth/callback/oauth',
  scope: 'businesses.readonly businesses.write contacts.readonly contacts.write locations.readonly',
  response_type: 'code',
  state: RANDOM_STATE_STRING
}[1]
```

**Token Exchange**
1. After authorization, exchange the code for tokens:
```javascript
const tokenUrl = 'https://services.leadconnectorhq.com/oauth/token'
const tokenParams = {
  grant_type: 'authorization_code',
  code: AUTH_CODE,
  client_id: YOUR_CLIENT_ID,
  client_secret: YOUR_CLIENT_SECRET,
  redirect_uri: 'http://localhost:3000/api/auth/callback/oauth'
}[1][5]
```

## Common Issues Resolution

**403 Error on /integrations/public/company**
- Ensure you're including the access token in the Authorization header:
```javascript
headers: {
  'Authorization': `Bearer ${access_token}`,
  'Version': '2021-07-28'
}[12]
```

**400 Error on /oauth/authorize**
- The location_id parameter should not be included in the initial authorization request
- Location selection happens during the OAuth flow in the GoHighLevel interface[11]

## Required Headers

For all API calls after authentication:
```javascript
{
  'Authorization': `Bearer ${access_token}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json'
}[17]
```

## Token Management

- Access tokens expire after 24 hours
- Refresh tokens last up to one year
- Implement automatic token refresh:
```javascript
const refreshParams = {
  grant_type: 'refresh_token',
  refresh_token: STORED_REFRESH_TOKEN,
  client_id: YOUR_CLIENT_ID,
  client_secret: YOUR_CLIENT_SECRET
}[9]
```

GoHighLevel's OAuth2 implementation requires specific steps and parameters for successful authorization. Here's the correct sequence and implementation details:

## OAuth2 Flow Implementation

**Authorization Request**
- Direct users to the authorization server with these required parameters:
```
GET https://marketplace.leadconnectorhq.com/oauth/chooselocation
?client_id=YOUR_CLIENT_ID
&response_type=code
&redirect_uri=YOUR_REDIRECT_URI
&scope=businesses.readonly businesses.write contacts.readonly contacts.write locations.readonly
```

**Token Exchange**
```javascript
POST https://services.leadconnectorhq.com/oauth/token
{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "grant_type": "authorization_code",
  "code": "AUTHORIZATION_CODE",
  "redirect_uri": "YOUR_REDIRECT_URI"
}
```

## Required Headers
For API calls after authorization:
```javascript
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN",
  "Version": "2021-07-28"
}
```

## Common Issues and Solutions

**403 Errors**
- Ensure you're using the correct access token[1]
- Verify the token hasn't expired (tokens last 24 hours)[9]
- Check if requested scopes match the endpoint permissions[5]

**400 Errors**
- Validate that all required parameters are included in the authorization request[1]
- Ensure the redirect URI matches exactly what's registered in your app[1]
- Verify the location_id is properly formatted and valid[3]

## Token Management

**Refresh Token Flow**
```javascript
POST https://services.leadconnectorhq.com/oauth/token
{
  "grant_type": "refresh_token",
  "refresh_token": "YOUR_REFRESH_TOKEN",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}
```

The refresh token lasts for up to one year and should be used to automatically generate new access tokens before they expire[11].

In NextAuth.js, the default callback URL format for OAuth providers follows a specific structure in 2024/2025:

## Default Callback URL Format

The standard callback URL format is:
```
https://your-domain.com/api/auth/callback/{providerId}
```
Where `{providerId}` is the unique identifier of your OAuth provider[5].

## Key Points

- For Next.js applications, the default `basePath` is `/api/auth`[5]
- The callback URL must be registered in your OAuth provider's dashboard[3]
- The URL must match exactly what's configured in your provider settings to avoid "Callback URL mismatch" errors[3]

## Provider Configuration

When setting up an OAuth provider, you need to:

1. Configure the exact callback URL in your provider's dashboard[3]
2. Set the `NEXTAUTH_URL` environment variable in production[17]:
```
NEXTAUTH_URL=https://your-domain.com
```

## Custom Base Paths

If your Next.js application uses a custom base path, you must:

1. Specify the full route to the API endpoint[17]
2. Pass the `basePath` prop to the `SessionProvider`[17]

## Recent Changes

For Next.js 15 and Auth.js v5 (beta), the configuration remains largely the same, but the implementation has been simplified:

```typescript
import NextAuth from "next-auth";

export const { handlers, auth } = NextAuth({
  providers: [{
    id: "provider-id",
    name: "Provider Name",
    type: "oauth",
    ...
  }]
})[24]
```

The callback URL pattern cannot be directly overridden, as it's a core part of NextAuth's security model[5]. However, you can customize the redirect behavior after authentication using the redirect callback[22].

Based on the search results, here is the OAuth flow sequence for GoHighLevel's location selection:

## Initial Authorization Flow

1. The application directs users to the authorization URL:
```
https://marketplace.gohighlevel.com/oauth/chooselocation?
response_type=code&
redirect_uri={{REDIRECT_URL}}&
client_id={{CLIENT_ID}}&
scope={{SCOPES}}
```
Where scopes are space-separated permissions[16].

## Location Selection Process

**For Marketplace Apps:**
- Users are shown a location selection dropdown interface
- Once a location is selected, GoHighLevel redirects to the provided redirect_uri with an authorization code[1]
- The code is appended as a query parameter: `?code=0834cbd778dacf89c`[23]

**For Private Apps:**
- The app appears in the GHL dashboard after authorization
- Users select sub/agency accounts for installation[6]

## Token Exchange

After receiving the authorization code:

1. Make a POST request to `/oauth/token` endpoint with:
- Authorization code
- Client ID 
- Client secret
- Grant type
- Redirect URI[18]

2. The response includes:
- Access token
- Token type
- Expiration time
- Refresh token[18]

## Making API Calls

For subsequent API calls:
- Add Authorization header: `Bearer {access_token}`[20]
- Content-Type header: `application/json`[18]

The access token can then be used to make authenticated requests to GoHighLevel's API v2.0 endpoints on behalf of the selected location[3].

GoHighLevel's OAuth 2.0 marketplace flow involves several key steps and components:

## Authorization Flow

**Initial Setup**
- Register your application in the Developer's Marketplace to obtain Client ID and Client Secret credentials[1]
- Configure your OAuth redirect URI where users will be sent after authorization[4]
- Specify required API scopes for your application's permissions[4]

**Authorization Process**
1. Direct users to the authorization URL:
```
https://marketplace.leadconnectorhq.com/oauth/chooselocation
```
With required parameters:
- scope (e.g., contacts.readonly, locations.readonly)[5]
- client_id
- redirect_uri[1]

2. After user consent, receive the authorization code at your redirect URI[4]

3. Exchange the code for tokens:
- Make a POST request to `https://services.leadconnectorhq.com/oauth/token`
- Include client_id, client_secret, and authorization code[5]
- Receive access token and refresh token[1]

## Token Management

- Access tokens are valid for 24 hours[1]
- Refresh tokens are valid for one year or until used once[1]
- Store both tokens securely in your database[1]
- Use refresh token to obtain new access token when expired[1]

## API Versioning

**Version Headers**
- All API requests require a Version header
- Use `Version: 2021-07-28` for v2 API calls[3]

**Rate Limits**
- V2 API: 100 requests per 10 seconds per app per resource[13]

## Important Notes

- The v1 API (using API tokens) will be deprecated on June 1, 2024[5]
- OAuth is mandatory for the v2 API[6]
- Location ID is required for most API endpoints and can be found in the Business Profile settings[11]

Configure Your App Listing Type for Visibility in Highlevel Accounts.

This can be selected while creating the app for the first time.

TABLE OF CONTENTS

Type: Standard
Type: White-Label


Type: Standard
Standard apps are visible at both the agency and sub-account levels under the Highlevel domain, depending on their distribution type. These apps are not visible at the agency and sub-account levels under white-label domains.



Type: White-Label
White-label apps are visible at the agency and sub-account levels under both white-label and non-white-label domains, according to their distribution type. These apps must not contain any references to Highlevel or Gohighlevel in their app properties, details, or on the company website. Any such references will result in disapproval during the app review process by the marketplace team.



Agencies and sub-accounts under white-label domains will only be able to install these apps. Given the nature of their type, white-label verified apps tend to have a broader reach as they are listed for both white-label and non-white-label agencies and sub-accounts. Therefore, it is recommended to fully white-label your app for maximum visibility.

When implementing GoHighLevel authentication in your Next.js app, you need to properly handle both the SSO key and client keys. Here's what you need to do:

## Client Keys Implementation

**Store Securely**
- Store client ID and client secret in environment variables using `.env.local`[4][8]:
```
GOHIGHLEVEL_CLIENT_ID=your_client_id
GOHIGHLEVEL_CLIENT_SECRET=your_client_secret
```

**Usage in OAuth Flow**
- Use these credentials when making OAuth token requests
- Never expose them in client-side code or commit them to version control[7]

## SSO Key Handling

**Storage**
- Store the SSO key securely on your backend server[1]
- Keep it separate from client-side code
- Treat it with the same security as the client secret

**Implementation**
- Use the SSO key to decrypt authentication tokens received during the Custom Pages flow[5]
- Set up your backend to handle SSO session decryption[1]

## Required Setup

**OAuth Configuration**
```typescript
// pages/api/auth/[...nextauth].js
export const authOptions = {
  providers: [
    {
      clientId: process.env.GOHIGHLEVEL_CLIENT_ID,
      clientSecret: process.env.GOHIGHLEVEL_CLIENT_SECRET,
      redirectUri: 'http://localhost:3000/api/auth/callback/gohighlevel'
    }
  ]
}
```

**SSO Integration**
- Implement endpoint to handle SSO session decryption
- Set up proper error handling for authentication flows
- Configure webhook URL to receive installation/uninstallation events[5]

Remember that all these credentials should be treated as secrets and never exposed in client-side code or logged in development environments[6].

GoHighLevel's OAuth 2.0 implementation for marketplace apps in 2025 follows a specific authorization flow with recent updates to enhance security.

## Authorization Flow

**Initial Authorization**
- OAuth 2.0 is the required protocol for API v2.0, which will eventually become the only available API version[1]
- The flow begins with redirecting users to the authorization endpoint for location/agency selection[1]
- Location Level Access (sub-account) and Agency Level Access (company) are the two available access types[1]

**Authentication Process**
- After user authorization, GoHighLevel redirects to your endpoint with a "code" parameter[1]
- The code must be exchanged for access and refresh tokens via a POST request to the OAuth token endpoint[1]
- Access tokens expire after 24 days and must be refreshed using the refresh token[2]

## Recent Changes

**Security Updates**
- As of October 2024, GoHighLevel implemented enhanced security measures for token generation[33]
- Two-Factor Authentication (2FA) is now mandatory for the Developer Portal[38]
- A temporary reconnect API was introduced (valid until October 15, 2024) to handle token corruption issues[33]

**Known Issues**

**Cross-Origin Communication**
- OAuth endpoints require proper CORS configuration for browser-based applications[19]
- For location selection, use the domain https://marketplace.leadconnectorhq.com/oauth/chooselocation for white-labeled instances[30]

**Best Practices**
- Store access tokens securely in your application[1]
- Implement proper token refresh mechanisms to maintain continuous access[1]
- Use Agency Level access for managing multiple locations under one authorization[1]
- Include all required scopes during the initial authorization request to ensure proper access permissions[2]

For GoHighLevel OAuth company validation in 2024, the process requires specific steps and headers:

## OAuth Flow Sequence

**Headers Required for Company Validation**
- Authorization: Bearer {access_token}
- Version: 2021-07-28
- Content-Type: application/json[1][4]

**Location vs Company Authentication**
The OAuth flow follows this sequence:
1. User must first authenticate at the company/agency level
2. User selects specific location(s) for app installation
3. System redirects to the specified redirect URI with an authorization code[1][3]

## Marketplace Requirements

**App Configuration**
- Developer must create a marketplace app with proper OAuth scopes
- App must specify both Location Level Access and Agency Level Access permissions[1]

**Authentication Components**
- Client ID and Client Secret are required for token exchange
- Redirect URI must be configured in app settings
- Authorization code is exchanged for access and refresh tokens[2][3]

**Token Management**
The OAuth process provides:
- Access Token for API requests
- Refresh Token for maintaining continuous access
- Token expiration handling capabilities[1]

Recent updates indicate that developers should ensure their apps can handle both location-specific and agency-wide authentication flows to maintain proper access control and data security[12][14].

For private, standard app listings in GoHighLevel, you need to use the OAuth token exchange endpoint at:

```
https://services.leadconnectorhq.com/oauth/token
```

This endpoint accepts a POST request and requires the following parameters:
- Authorization code (received from the OAuth flow)
- Client ID
- Client Secret
- Grant type
- Redirect URI[5]

A few important notes about the token system:

- Access tokens expire after 24 hours[2][8]
- Refresh tokens last up to one year and can be used to generate new access/refresh token pairs[2]
- The OAuth 2.0-based API (v2) will eventually become the only supported version[9]

Rate limits for the v2 API are set at:
- 100 requests per 10 seconds (burst limit)
- This limit applies per Marketplace app per resource (Location or Company)[9]

To exchange an authorization code for access tokens with GoHighLevel's OAuth endpoint in 2024/2025, you need to make a POST request with the following specifications:

## Request Format

**Endpoint URL:**
```
https://services.leadconnectorhq.com/oauth/token
```

**Headers:**
```http
Content-Type: application/json
Version: 2021-07-28
```

**Request Body:**
```json
{
  "client_id": "<your_client_id>",
  "client_secret": "<your_client_secret>",
  "code": "<authorization_code>",
  "grant_type": "authorization_code",
  "redirect_uri": "<your_redirect_uri>"
}
```

## Token Lifecycle

The OAuth flow provides two types of tokens[1]:
- **Access Token**: Valid for 24 hours
- **Refresh Token**: Valid for up to 1 year

## Token Refresh

When the access token expires, you can obtain a new one by making a POST request to the same endpoint with:

```json
{
  "grant_type": "refresh_token",
  "client_id": "<your_client_id>",
  "client_secret": "<your_client_secret>",
  "refresh_token": "<your_refresh_token>"
}
```

## Important Notes

- Store both access and refresh tokens securely[3]
- Implement automatic token refresh before the 24-hour expiration[4]
- For private apps, you don't need to go through the marketplace approval process[5]
- The Version header is required for all API v2 requests[5]
- Rate limits are set to 100 requests per 10 seconds per location[10]

For Next.js implementation, you should handle the OAuth flow on the server-side to keep your client credentials secure. Store the tokens in a secure database or environment variables, never exposing them to the client side.