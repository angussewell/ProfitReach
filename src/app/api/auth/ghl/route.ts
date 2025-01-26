import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  if (!process.env.NEXT_PUBLIC_GHL_CLIENT_ID || !process.env.NEXT_PUBLIC_GHL_REDIRECT_URI) {
    return NextResponse.json({ error: 'Missing OAuth configuration' }, { status: 500 });
  }

  // Create state with redirect URI
  const stateData = {
    nonce: Math.random().toString(36).substring(7),
    redirect_uri: process.env.NEXT_PUBLIC_GHL_REDIRECT_URI
  };
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
  
  // Define required scopes for our app
  const scopes = [
    'businesses.readonly',
    'businesses.write',
    'contacts.readonly',
    'contacts.write',
    'locations.readonly',
    'locations.write',
    'conversations.readonly',
    'conversations.write',
    'opportunities.readonly',
    'opportunities.write',
    'oauth.readonly',
    'oauth.write'
  ].join(' ');

  const authUrl = new URL('https://marketplace.leadconnectorhq.com/oauth/chooselocation');
  authUrl.searchParams.append('client_id', process.env.NEXT_PUBLIC_GHL_CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', process.env.NEXT_PUBLIC_GHL_REDIRECT_URI);
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('state', state);

  // Create response with redirect
  const response = NextResponse.redirect(authUrl.toString());

  // Set cookie on the response
  const cookieStore = await cookies();
  cookieStore.set('ghl_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 5, // 5 minutes
  });

  return response;
} 