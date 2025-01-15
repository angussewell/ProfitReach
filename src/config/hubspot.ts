import { Client } from '@hubspot/api-client';

// HubSpot OAuth Configuration
export const HUBSPOT_CONFIG = {
  clientId: process.env.HUBSPOT_CLIENT_ID,
  clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
  redirectUri: process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/api/auth/callback/hubspot'
    : 'https://hubspot-dashboard.vercel.app/api/auth/callback/hubspot',
  scopes: [
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.objects.marketing_events.read',
    'oauth'
  ],
};

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