import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const locationId = searchParams.get('location_id');

  // Get cookies instance
  const cookieStore = await cookies();
  const savedState = cookieStore.get('ghl_auth_state')?.value;
  
  if (!state || state !== savedState) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  if (!code || !locationId) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    // Decode state to get redirect URI
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const redirect_uri = stateData.redirect_uri;

    const tokenResponse = await fetch('https://services.gohighlevel.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      throw new Error('Failed to exchange code for token');
    }

    const { access_token, refresh_token, expires_in } = await tokenResponse.json();

    // Store tokens in database
    await prisma.account.upsert({
      where: { ghl_location_id: locationId },
      update: {
        access_token,
        refresh_token,
        token_expires_at: new Date(Date.now() + expires_in * 1000),
      },
      create: {
        ghl_location_id: locationId,
        access_token,
        refresh_token,
        token_expires_at: new Date(Date.now() + expires_in * 1000),
      },
    });

    // Create response with redirect
    const response = NextResponse.redirect(new URL('/settings/scenarios', request.url));

    // Clear auth state cookie
    response.cookies.delete('ghl_auth_state');

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 