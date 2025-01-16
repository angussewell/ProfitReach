import { Client } from '@hubspot/api-client';

// Validate required environment variables
if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
  throw new Error('HUBSPOT_PRIVATE_APP_TOKEN is required');
}

// HubSpot Configuration
export const HUBSPOT_CONFIG = {
  privateAppToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN,
  scopes: [
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.objects.marketing_events.read'
  ],
};

// Log configuration on initialization (excluding secrets)
console.log('[HubSpot] Configuration:', {
  hasPrivateAppToken: !!HUBSPOT_CONFIG.privateAppToken,
  scopes: HUBSPOT_CONFIG.scopes.join(' '),
  nodeEnv: process.env.NODE_ENV,
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