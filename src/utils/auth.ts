export const GHL_SCOPES = [
  'businesses.readonly',
  'businesses.write',
  'custom-menu-link.write',
  'custom-menu-link.readonly',
  'emails/builder.readonly',
  'emails/builder.write',
  'users.readonly',
  'users.write',
  'workflows.readonly',
  'oauth.readonly',
  'oauth.write',
  'opportunities.readonly',
  'opportunities.write',
  'locations/customFields.write',
  'locations/customFields.readonly',
  'locations/customValues.write',
  'locations/customValues.readonly',
  'conversations/message.readonly',
  'conversations/message.write',
  'conversations/reports.readonly',
  'conversations/livechat.write',
  'conversations.write',
  'conversations.readonly',
  'campaigns.readonly',
  'companies.readonly'
];

export function generateRandomState() {
  return Math.random().toString(36).substring(7);
}

export function generateAuthUrl() {
  const clientId = process.env.NEXT_PUBLIC_GHL_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GHL_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error('Missing required environment variables:', {
      clientId: !!clientId,
      redirectUri: !!redirectUri
    });
    throw new Error('Missing required OAuth configuration');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: GHL_SCOPES.join(' '),
    response_type: 'code',
    state: generateRandomState()
  });

  return `https://marketplace.leadconnectorhq.com/oauth/chooselocation?${params.toString()}`;
} 