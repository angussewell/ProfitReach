import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Use default values for development
const UNIPILE_DSN = process.env.UNIPILE_DSN || 'api4.unipile.com:13465';
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Format expiration date with milliseconds precision
    const expiresDate = new Date(Date.now() + 3600000);
    const expiresOn = expiresDate.toISOString().split('.')[0] + '.000Z';

    // Generate a Unipile hosted auth link
    const unipileUrl = `https://${UNIPILE_DSN}/api/v1/hosted/accounts/link`;
    const payload = {
      type: 'create',
      providers: ['GOOGLE', 'OUTLOOK', 'MAIL'],
      api_url: UNIPILE_DSN,
      expiresOn,
      notify_url: `${baseUrl}/api/webhooks/unipile`,
      name: session.user.organizationId,
      success_redirect_url: `${baseUrl}/email-accounts?success=true`,
      failure_redirect_url: `${baseUrl}/email-accounts?error=true`,
      disabled_options: ['autoproxy']
    };

    console.log('Requesting Unipile auth link:', { url: unipileUrl, payload });

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

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating auth link:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 