import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Log module initialization
console.log('🚀 Initializing account connection handler:', {
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV,
  handler: 'account-connection'
});

const UNIPILE_DSN = process.env.UNIPILE_DSN || 'api4.unipile.com:13465';
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;

// Production URL configuration
const PRODUCTION_URL = 'https://app.messagelm.com';
const APP_URL = process.env.NODE_ENV === 'production' ? PRODUCTION_URL : process.env.NEXT_PUBLIC_APP_URL;

// Separate API and webhook URLs
const UNIPILE_API_URL = `https://${UNIPILE_DSN}`;
const WEBHOOK_URL = `${APP_URL}/api/webhooks/unipile`;

// Log configuration on module load
console.log('🌍 Connection configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  APP_URL,
  UNIPILE_DSN,
  UNIPILE_API_URL,
  WEBHOOK_URL,
  hasApiKey: !!UNIPILE_API_KEY,
  timestamp: new Date().toISOString()
});

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🔄 [${requestId}] Starting account connection process:`, {
    timestamp: new Date().toISOString(),
    handler: 'account-connection'
  });
  
  try {
    // Log request details
    console.log(`📝 [${requestId}] Request details:`, {
      headers: Object.fromEntries(request.headers.entries()),
      cookies: request.headers.get('cookie'),
      url: request.url,
      timestamp: new Date().toISOString()
    });

    const session = await getServerSession(authOptions);
    console.log(`🔑 [${requestId}] Session data:`, {
      hasSession: !!session,
      hasUser: !!session?.user,
      organizationId: session?.user?.organizationId,
      email: session?.user?.email,
      timestamp: new Date().toISOString()
    });

    if (!session?.user?.organizationId) {
      console.error(`❌ [${requestId}] Unauthorized - Missing session or organization ID:`, {
        hasSession: !!session,
        hasUser: !!session?.user,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: !session ? 'No session found' : 'No organization ID found'
      }, { status: 401 });
    }

    if (!UNIPILE_API_KEY) {
      console.error(`❌ [${requestId}] Missing required environment variable: UNIPILE_API_KEY`);
      return NextResponse.json(
        { error: 'Unipile API key missing' },
        { status: 500 }
      );
    }

    // Format expiration date exactly as required: YYYY-MM-DDTHH:MM:SS.sssZ
    const expiresDate = new Date(Date.now() + 3600000);
    const expiresOn = expiresDate.toISOString();

    // Generate success and failure URLs
    const successUrl = `${APP_URL}/accounts?success=true`;
    const failureUrl = `${APP_URL}/accounts?error=true`;

    console.log(`🔗 [${requestId}] Generated URLs:`, {
      webhook: WEBHOOK_URL,
      success: successUrl,
      failure: failureUrl,
      timestamp: new Date().toISOString()
    });

    // Generate a Unipile hosted auth link
    const unipileUrl = `${UNIPILE_API_URL}/api/v1/hosted/accounts/link`;
    const payload = {
      type: "create",
      providers: "*",
      api_url: UNIPILE_API_URL,
      expiresOn,
      notify_url: WEBHOOK_URL,
      name: session.user.organizationId,
      success_redirect_url: successUrl,
      failure_redirect_url: failureUrl,
      disabled_options: ["autoproxy"]
    };

    console.log(`📤 [${requestId}] Requesting Unipile auth link:`, { 
      url: unipileUrl, 
      payload: {
        ...payload,
        // Redact sensitive data in logs
        name: '[REDACTED]',
      },
      timestamp: new Date().toISOString()
    });

    // Log the exact webhook URL being registered
    console.log(`🎯 [${requestId}] REGISTERING WEBHOOK URL:`, {
      url: WEBHOOK_URL,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      fullPayload: {
        ...payload,
        name: '[REDACTED]'
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
      console.error(`❌ [${requestId}] Failed to generate Unipile auth link:`, {
        status: response.status,
        error: errorText,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        { error: 'Failed to generate account connection link', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ [${requestId}] Successfully generated auth link:`, {
      timestamp: new Date().toISOString(),
      hasUrl: !!data.url
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error(`❌ [${requestId}] Error generating auth link:`, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
      timestamp: new Date().toISOString()
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