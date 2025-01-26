'use client';

import { useSession } from 'next-auth/react';

export function GHLAuthButton() {
  const { data: session } = useSession();

  const handleConnect = () => {
    if (!session?.user?.organizationId) {
      console.error('No organization ID found in session');
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GHL_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_GHL_REDIRECT_URI;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://profit-reach.vercel.app';

    if (!clientId || !redirectUri) {
      console.error('Missing required environment variables');
      return;
    }

    const scopes = [
      'businesses.readonly',
      'businesses.write',
      'contacts.readonly',
      'contacts.write',
      'locations.readonly',
      'locations.write',
      'conversations.readonly',
      'conversations.write',
      'tasks.readonly',
      'tasks.write'
    ].join(' ');

    const authUrl = new URL('https://marketplace.leadconnectorhq.com/oauth/chooselocation');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', session.user.organizationId);

    window.location.href = authUrl.toString();
  };

  return (
    <button
      onClick={handleConnect}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      disabled={!session?.user?.organizationId}
    >
      Connect GoHighLevel
    </button>
  );
} 