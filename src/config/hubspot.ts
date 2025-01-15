import { Client } from '@hubspot/api-client';

const PRODUCTION_URL = 'https://hubspot-dashboard.vercel.app';
const DEVELOPMENT_URL = 'http://localhost:3000';

// Validate required environment variables
if (!process.env.HUBSPOT_CLIENT_ID) {
  throw new Error('HUBSPOT_CLIENT_ID is required');
}
if (!process.env.HUBSPOT_CLIENT_SECRET) {
  throw new Error('HUBSPOT_CLIENT_SECRET is required');
}

// Validate credentials in production
if (process.env.NODE_ENV === 'production') {
  if (process.env.HUBSPOT_CLIENT_ID === '875a7b08-7bb0-4a61-bc02-3354feec681c') {
    throw new Error('Development HubSpot Client ID cannot be used in production');
  }
  if (process.env.HUBSPOT_CLIENT_SECRET === '915d00b9-fb17-4670-8d06-6d046483dfa8') {
    throw new Error('Development HubSpot Client Secret cannot be used in production');
  }
  if (process.env.HUBSPOT_APP_ID === '6901795') {
    throw new Error('Development HubSpot App ID cannot be used in production');
  }
}

// HubSpot OAuth Configuration
export const HUBSPOT_CONFIG = {
  appId: process.env.HUBSPOT_APP_ID,
  clientId: process.env.HUBSPOT_CLIENT_ID,
  clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
  baseUrl: process.env.NODE_ENV === 'development' ? DEVELOPMENT_URL : PRODUCTION_URL,
  redirectUri: process.env.HUBSPOT_REDIRECT_URI || (
    process.env.NODE_ENV === 'development'
      ? `${DEVELOPMENT_URL}/api/auth/callback/hubspot`
      : `${PRODUCTION_URL}/api/auth/callback/hubspot`
  ),
  scopes: [
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.objects.marketing_events.read',
    'oauth'
  ],
};

// Log configuration on initialization (excluding secrets)
console.log('[HubSpot] Configuration:', {
  appId: HUBSPOT_CONFIG.appId,
  baseUrl: HUBSPOT_CONFIG.baseUrl,
  redirectUri: HUBSPOT_CONFIG.redirectUri,
  scopes: HUBSPOT_CONFIG.scopes.join(' '),
  nodeEnv: process.env.NODE_ENV,
  nextAuthUrl: process.env.NEXTAUTH_URL,
  hasClientId: !!HUBSPOT_CONFIG.clientId,
  hasClientSecret: !!HUBSPOT_CONFIG.clientSecret
});

// Initialize the HubSpot client with the access token
export const getHubspotClient = (accessToken: string) => {
  return new Client({ accessToken });
};

// Define types for common HubSpot objects
export interface Contact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    createdate?: string;
    lastmodifieddate?: string;
  };
}

export interface SequenceStats {
  id: string;
  name: string;
  stats: {
    enrolled: number;
    active: number;
    completed: number;
    replied: number;
  };
}

// API endpoints configuration
export const HUBSPOT_API_CONFIG = {
  baseUrl: 'https://api.hubapi.com',
  endpoints: {
    contacts: '/crm/v3/objects/contacts',
    sequences: '/automation/v3/sequences',
    sequenceEnrollments: '/automation/v3/enrollments',
    marketingEmails: '/marketing-emails/v1/emails'
  },
}; 