import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://profit-reach.vercel.app';
  
  // Get the current session to get organization ID
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    console.error('No organization ID found in session');
    return NextResponse.redirect(`${baseUrl}/?error=no_organization`);
  }

  if (!code) {
    console.error('No code provided in callback');
    return NextResponse.redirect(`${baseUrl}/?error=no_code`);
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
    return NextResponse.redirect(`${baseUrl}/?error=config`);
  }

  try {
    const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error,
        headers: Object.fromEntries(tokenResponse.headers)
      });
      return NextResponse.redirect(`${baseUrl}/?error=token_exchange&details=${encodeURIComponent(error)}`);
    }

    const { access_token, refresh_token, expires_in } = await tokenResponse.json();
    
    // Decode the access token to get the location ID
    const decodedToken = jwt.decode(access_token) as any;
    const locationId = decodedToken?.authClassId;
    const locationName = decodedToken?.locationName || null;

    if (!locationId) {
      console.error('No location ID found in token:', { decodedToken });
      return NextResponse.redirect(`${baseUrl}/?error=no_location`);
    }

    console.log('Creating GHL integration record:', {
      locationId,
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      expiresIn: expires_in
    });

    // Store tokens in GHLIntegration table
    await prisma.GHLIntegration.upsert({
      where: {
        organizationId_locationId: {
          organizationId: session.user.organizationId,
          locationId
        }
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        locationName
      },
      create: {
        organizationId: session.user.organizationId,
        locationId,
        locationName,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000)
      }
    });

    console.log('Successfully stored tokens, redirecting to scenarios');
    
    // Redirect to dashboard with success parameter using absolute URL
    return NextResponse.redirect(`${baseUrl}/settings/scenarios?status=success`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/?error=unknown&details=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`);
  }
} 