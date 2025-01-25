import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  if (!process.env.NEXT_PUBLIC_GHL_CLIENT_ID || !process.env.NEXT_PUBLIC_GHL_REDIRECT_URI) {
    return NextResponse.json({ error: 'Missing OAuth configuration' }, { status: 500 });
  }

  const state = Math.random().toString(36).substring(7);
  
  const authUrl = new URL('https://marketplace.gohighlevel.com/oauth/chooselocation');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.NEXT_PUBLIC_GHL_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.NEXT_PUBLIC_GHL_REDIRECT_URI);
  authUrl.searchParams.append('scope', 'businesses.readonly businesses.write contacts.readonly contacts.write');
  authUrl.searchParams.append('state', state);

  const cookieStore = cookies();
  cookieStore.set('ghl_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 5, // 5 minutes
  });

  return NextResponse.redirect(authUrl.toString());
} 