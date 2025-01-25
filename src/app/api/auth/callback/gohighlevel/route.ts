import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.json({ error: 'Authorization code required' }, { status: 400 });
  }

  // Validate environment variables
  const clientId = process.env.NEXT_PUBLIC_GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_GHL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('Missing required environment variables:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirectUri: !!redirectUri
    });
    return NextResponse.json({ error: 'OAuth configuration error' }, { status: 500 });
  }

  try {
    const requestBody = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    };

    console.log('Token exchange request:', {
      url: 'https://services.leadconnectorhq.com/oauth/token',
      method: 'POST',
      hasCode: !!code,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      redirectUri
    });

    const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(requestBody),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error,
        headers: Object.fromEntries(tokenResponse.headers)
      });
      throw new Error(`Token exchange failed: ${error}`);
    }

    const { access_token, refresh_token, expires_in } = await tokenResponse.json();

    // Store tokens in database
    await prisma.account.create({
      data: {
        access_token,
        refresh_token,
        token_expires_at: new Date(Date.now() + expires_in * 1000),
      },
    });

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/settings/scenarios', request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json({ 
      error: 'Failed to exchange code for tokens',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 