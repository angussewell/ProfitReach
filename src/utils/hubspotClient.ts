import { Client } from '@hubspot/api-client';

if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
  throw new Error('HUBSPOT_PRIVATE_APP_TOKEN is not defined');
}

const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN,
  defaultHeaders: {
    'User-Agent': 'hubspot-dashboard'
  }
});

export { hubspotClient };
export default hubspotClient;