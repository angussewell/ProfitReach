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

// Configure Unipile URLs based on environment
const UNIPILE_BASE_DSN = process.env.UNIPILE_DSN?.split(':')[0] || 'api4.unipile.com';  // Base DSN without port
const UNIPILE_FULL_DSN = process.env.UNIPILE_DSN || 'api4.unipile.com:13465';  // Full DSN with port
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;

// Production URL configuration
const PRODUCTION_URL = 'https://app.messagelm.com';
const APP_URL = process.env.NODE_ENV === 'production' ? PRODUCTION_URL : process.env.NEXT_PUBLIC_APP_URL;

// Configure Unipile URLs according to documentation
const UNIPILE_API_URL = `https://${UNIPILE_FULL_DSN}`;  // API URL with port
const UNIPILE_OAUTH_URL = `https://${UNIPILE_BASE_DSN}`;  // OAuth URL without port
const WEBHOOK_URL = `${APP_URL}/api/webhooks/unipile`;

// Log all URL configurations
console.log('🌍 Connection configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  APP_URL,
  UNIPILE_BASE_DSN,
  UNIPILE_FULL_DSN,
  UNIPILE_API_URL,
  UNIPILE_OAUTH_URL,
  WEBHOOK_URL,
  hasApiKey: !!UNIPILE_API_KEY,
  timestamp: new Date().toISOString()
});

// Validate environment configuration
const validateEnvironment = () => {
  const requiredVars = {
    UNIPILE_API_KEY: process.env.UNIPILE_API_KEY,
    UNIPILE_DSN: process.env.UNIPILE_DSN,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', {
      missingVars,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
    return false;
  }

  return true;
};

// Configure environment-specific URLs
const getEnvironmentUrls = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const PRODUCTION_URL = 'https://app.messagelm.com';
  
  return {
    baseUrl: isProduction ? PRODUCTION_URL : process.env.NEXT_PUBLIC_APP_URL,
    authUrl: isProduction ? PRODUCTION_URL : process.env.NEXTAUTH_URL,
    webhookUrl: `${isProduction ? PRODUCTION_URL : process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/unipile`
  };
};

// Function to create temporary email account
async function createTemporaryEmailAccount(organizationId: string, requestId: string): Promise<string> {
  try {
    const tempAccount = await prisma.emailAccount.create({
      data: {
        email: `pending_${requestId}@temp.messagelm.com`,
        name: `Pending Account ${requestId}`,
        organizationId,
        isActive: false
      }
    });

    console.log(`✅ [${requestId}] Created temporary email account:`, {
      id: tempAccount.id,
      organizationId,
      timestamp: new Date().toISOString()
    });

    return tempAccount.id;
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to create temporary account:`, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Function to create temporary social account
async function createTemporarySocialAccount(organizationId: string, requestId: string, provider: string): Promise<string> {
  try {
    const tempAccount = await prisma.socialAccount.create({
      data: {
        username: `pending_${requestId}`,
        name: `Pending Account ${requestId}`,
        provider,
        organizationId,
        isActive: false
      }
    });

    console.log(`✅ [${requestId}] Created temporary social account:`, {
      id: tempAccount.id,
      provider,
      organizationId,
      timestamp: new Date().toISOString()
    });

    return tempAccount.id;
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to create temporary social account:`, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🔄 [${requestId}] Starting account connection process:`, {
    timestamp: new Date().toISOString(),
    handler: 'account-connection',
    environment: process.env.NODE_ENV
  });
  
  try {
    // Validate environment configuration
    if (!validateEnvironment()) {
      return NextResponse.json({ 
        error: 'Server configuration error', 
        details: 'Missing required environment variables'
      }, { status: 500 });
    }

    // Get environment-specific URLs
    const urls = getEnvironmentUrls();
    console.log(`🌍 [${requestId}] Environment URLs:`, {
      ...urls,
      timestamp: new Date().toISOString()
    });

    // Parse request body to get account type
    const body = await request.json();
    const accountType = body.accountType?.toUpperCase() || 'EMAIL';

    // Log request details
    console.log(`📝 [${requestId}] Request details:`, {
      headers: Object.fromEntries(request.headers.entries()),
      cookies: request.headers.get('cookie'),
      url: request.url,
      body,
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
      console.error(`❌ [${requestId}] Unauthorized - Missing organization ID:`, {
        hasSession: !!session,
        hasUser: !!session?.user,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: 'No organization ID found'
      }, { status: 401 });
    }

    if (!UNIPILE_API_KEY) {
      console.error(`❌ [${requestId}] Missing required environment variable: UNIPILE_API_KEY`);
      return NextResponse.json(
        { error: 'Unipile API key missing' },
        { status: 500 }
      );
    }

    // Create temporary account based on type
    let tempAccountId;
    if (accountType === 'LINKEDIN') {
      tempAccountId = await createTemporarySocialAccount(session.user.organizationId, requestId, 'LINKEDIN');
    } else {
      tempAccountId = await createTemporaryEmailAccount(session.user.organizationId, requestId);
    }

    // Format expiration date
    const expiresDate = new Date(Date.now() + 3600000);
    const expiresOn = expiresDate.toISOString();

    // Generate success and failure URLs
    const successUrl = `${urls.baseUrl}/accounts?success=true`;
    const failureUrl = `${urls.baseUrl}/accounts?error=true`;

    // Encode temporary account ID and type for tracking
    const encodedName = `temp_${accountType.toLowerCase()}_${tempAccountId}`;
    console.log(`🏢 [${requestId}] Encoded temporary account ID:`, {
      tempAccountId,
      accountType,
      encoded: encodedName,
      timestamp: new Date().toISOString()
    });

    // Generate Unipile hosted auth link
    const payload = {
      type: "create",
      providers: accountType === 'LINKEDIN' ? "linkedin" : "*",
      api_url: UNIPILE_API_URL,
      oauth_url: UNIPILE_OAUTH_URL,
      expiresOn,
      notify_url: urls.webhookUrl,
      name: encodedName,
      success_redirect_url: successUrl,
      failure_redirect_url: failureUrl,
      disabled_options: ["autoproxy"]
    };

    console.log(`📤 [${requestId}] Requesting Unipile auth link:`, {
      url: `${UNIPILE_API_URL}/api/v1/hosted/accounts/link`,
      payload: {
        ...payload,
        name: '[REDACTED]'
      },
      timestamp: new Date().toISOString()
    });

    const response = await fetch(`${UNIPILE_API_URL}/api/v1/hosted/accounts/link`, {
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
      console.error(`❌ [${requestId}] Failed to generate auth link:`, {
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
    console.log(`✅ [${requestId}] Generated auth link:`, {
      hasUrl: !!data.url,
      tempAccountId,
      accountType,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      ...data,
      tempAccountId,
      accountType
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Error:`, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 