export function generateRandomState() {
  return Math.random().toString(36).substring(7);
}

export function generateAuthUrl() {
  const scopes = [
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
  ].join(' ');

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GHL_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_GHL_REDIRECT_URI!,
    scope: scopes,
    response_type: 'code',
    state: generateRandomState()
  });

  return `https://marketplace.gohighlevel.com/oauth/chooselocation?${params.toString()}`;
} 