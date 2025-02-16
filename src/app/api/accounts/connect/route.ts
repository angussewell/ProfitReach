import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Use default values for development
const UNIPILE_DSN = process.env.UNIPILE_DSN || 'api4.unipile.com:13465';
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;

export async function POST(request: Request) {
  console.log('Starting account connection process');
  
  try {
    // Log request details
    console.log('Request details:', {
      headers: Object.fromEntries(request.headers.entries()),
      cookies: request.headers.get('cookie'),
      url: request.url
    });

    const session = await getServerSession(authOptions);
    console.log('Session data:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      organizationId: session?.user?.organizationId,
      email: session?.user?.email
    });

    if (!session?.user?.organizationId) {
      console.error('Unauthorized - Missing session or organization ID');
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: !session ? 'No session found' : 'No organization ID found'
      }, { status: 401 });
    }

    if (!UNIPILE_API_KEY) {
      console.error('Missing required environment variable: UNIPILE_API_KEY');
      return NextResponse.json(
        { error: 'Unipile API key missing' },
        { status: 500 }
      );
    }

    // Get the base URL for webhooks
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      console.error('Missing required environment variable: NEXT_PUBLIC_APP_URL');
      return NextResponse.json(
        { error: 'Application URL not configured' },
        { status: 500 }
      );
    }

    // Ensure we're using a public URL for webhooks in development
    const webhookUrl = process.env.NODE_ENV === 'development' 
      ? process.env.NGROK_URL || baseUrl 
      : baseUrl;

    console.log('Using webhook URL:', {
      baseUrl,
      webhookUrl,
      environment: process.env.NODE_ENV
    });

    // Format expiration date exactly as required: YYYY-MM-DDTHH:MM:SS.sssZ
    const expiresDate = new Date(Date.now() + 3600000);
    const expiresOn = expiresDate.toISOString();

    // Generate a Unipile hosted auth link
    const unipileUrl = `https://${UNIPILE_DSN}/api/v1/hosted/accounts/link`;
    const payload = {
      type: "create",
      providers: "*",
      api_url: `https://${UNIPILE_DSN}`,
      expiresOn,
      notify_url: `${webhookUrl}/api/webhooks/unipile`,
      name: session.user.organizationId,
      success_redirect_url: `${baseUrl}/accounts?success=true`,
      failure_redirect_url: `${baseUrl}/accounts?error=true`,
      disabled_options: ["autoproxy"]
    };

    console.log('Requesting Unipile auth link:', { 
      url: unipileUrl, 
      payload,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // Redact API key in logs
        'X-API-KEY': 'REDACTED'
      }
    });

    const response = await fetch(unipileUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-KEY': UNIPILE_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to generate Unipile auth link:', {
        status: response.status,
        error: errorText,
        payload
      });
      return NextResponse.json(
        { error: 'Failed to generate account connection link', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Successfully generated auth link:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating auth link:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error)
    });
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 