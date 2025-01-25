import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    console.error('No code provided in callback');
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
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
    return NextResponse.redirect(new URL('/?error=config', request.url));
  }

  try {
    const formData = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

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
        'Content-Type': 'application/x-www-form-urlencoded',
        'Version': '2021-07-28'
      },
      body: formData.toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error,
        headers: Object.fromEntries(tokenResponse.headers)
      });
      return NextResponse.redirect(new URL(`/?error=token_exchange&details=${encodeURIComponent(error)}`, request.url));
    }

    const { access_token, refresh_token, expires_in } = await tokenResponse.json();
    
    // Decode the access token to get the location ID
    const decodedToken = jwt.decode(access_token) as any;
    const locationId = decodedToken?.authClassId;

    if (!locationId) {
      console.error('No location ID found in token:', { decodedToken });
      return NextResponse.redirect(new URL('/?error=no_location', request.url));
    }

    console.log('Creating account record:', {
      locationId,
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      expiresIn: expires_in
    });

    // Store tokens in database
    await prisma.account.create({
      data: {
        ghl_location_id: locationId,
        access_token,
        refresh_token,
        token_expires_at: new Date(Date.now() + expires_in * 1000),
      },
    });

    console.log('Successfully stored tokens, redirecting to scenarios');
    
    // Redirect to dashboard with success parameter
    return NextResponse.redirect(new URL('/settings/scenarios?status=success', request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL(`/?error=unknown&details=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url));
  }
} 