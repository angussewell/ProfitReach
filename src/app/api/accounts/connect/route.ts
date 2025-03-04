import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Unipile configuration from environment variables
const UNIPILE_BASE_DSN = process.env.UNIPILE_DSN?.split(':')[0] || 'api4.unipile.com';
const UNIPILE_FULL_DSN = process.env.UNIPILE_DSN || 'api4.unipile.com:13465';
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
const UNIPILE_API_URL = `https://${UNIPILE_FULL_DSN}`;

// Log configuration on module load
console.log('🔗 Unipile connect configuration:', {
  UNIPILE_BASE_DSN,
  UNIPILE_FULL_DSN,
  UNIPILE_API_URL,
  hasApiKey: !!UNIPILE_API_KEY,
  timestamp: new Date().toISOString()
});

// Provider mapping for different account types
const PROVIDER_MAP = {
  EMAIL: ['GOOGLE', 'OUTLOOK', 'MAIL'],  // Match example payload exactly
  LINKEDIN: ['LINKEDIN']
} as const;

// Function to create a pending email account
async function createPendingEmailAccount(organizationId: string): Promise<string> {
  const pendingName = `PENDING_EMAIL_${organizationId}_${Date.now()}`;
  const account = await prisma.emailAccount.create({
    data: {
      email: `pending_${Date.now()}@pending.local`,
      name: pendingName,
      organizationId,
      isActive: false
    }
  });
  return account.id;
}

// Function to create a pending social account
async function createPendingSocialAccount(organizationId: string): Promise<string> {
  const pendingName = `PENDING_LINKEDIN_${organizationId}_${Date.now()}`;
  const account = await prisma.socialAccount.create({
    data: {
      username: `pending_${Date.now()}`,
      name: pendingName,
      provider: 'LINKEDIN',
      organizationId,
      isActive: false
    }
  });
  return account.id;
}

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🔄 [${requestId}] Account connection request:`, {
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString()
  });

  try {
    // Validate Unipile configuration
    if (!UNIPILE_API_KEY) {
      console.error(`❌ [${requestId}] Missing Unipile API key`);
      return NextResponse.json({ 
        error: 'Configuration error',
        details: 'Unipile API key not configured'
      }, { status: 500 });
    }

    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      console.error(`❌ [${requestId}] Unauthorized request:`, {
        hasSession: !!session,
        hasUser: !!session?.user,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error(`❌ [${requestId}] Failed to parse request body:`, {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ 
        error: 'Invalid request',
        details: 'Failed to parse request body'
      }, { status: 400 });
    }

    const accountType = body.accountType?.toUpperCase();
    
    console.log(`📦 [${requestId}] Request body:`, {
      accountType,
      body,
      timestamp: new Date().toISOString()
    });

    // Validate account type
    if (!PROVIDER_MAP[accountType as keyof typeof PROVIDER_MAP]) {
      console.error(`❌ [${requestId}] Invalid account type:`, {
        accountType,
        validTypes: Object.keys(PROVIDER_MAP),
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ 
        error: 'Invalid account type',
        details: `Account type must be either EMAIL or LINKEDIN`,
        provided: accountType
      }, { status: 400 });
    }

    // Create pending account based on type
    let pendingAccountId;
    try {
      if (accountType === 'EMAIL') {
        pendingAccountId = await createPendingEmailAccount(session.user.organizationId);
      } else {
        pendingAccountId = await createPendingSocialAccount(session.user.organizationId);
      }
      console.log(`✅ [${requestId}] Created pending account:`, {
        id: pendingAccountId,
        type: accountType,
        organizationId: session.user.organizationId,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error(`❌ [${requestId}] Failed to create pending account:`, {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ 
        error: 'Database error',
        details: 'Failed to create pending account'
      }, { status: 500 });
    }

    // Create payload matching Unipile's schema exactly
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      console.error(`❌ [${requestId}] Missing NEXT_PUBLIC_APP_URL`);
      return NextResponse.json({ 
        error: 'Configuration error',
        details: 'Application URL not configured'
      }, { status: 500 });
    }

    const payload = {
      type: "create",
      providers: PROVIDER_MAP[accountType as keyof typeof PROVIDER_MAP],
      api_url: UNIPILE_API_URL,
      expiresOn: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      name: `org_${session.user.organizationId}_${accountType}_${Date.now()}`,
      success_redirect_url: `${baseUrl}/accounts?success=true`,
      failure_redirect_url: `${baseUrl}/accounts?error=true`,
      notify_url: `${baseUrl}/api/webhooks/unipile`
    };

    console.log(`🔗 [${requestId}] Creating connection link:`, {
      accountType,
      payload,
      apiUrl: UNIPILE_API_URL,
      timestamp: new Date().toISOString()
    });

    // Make request to Unipile with timeout
    let response;
    try {
      response = await fetch(`${UNIPILE_API_URL}/api/v1/hosted/accounts/link`, {
        method: 'POST',
        headers: {
          'X-API-KEY': UNIPILE_API_KEY,
          'accept': 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (fetchError) {
      console.error(`❌ [${requestId}] Network error calling Unipile:`, {
        error: fetchError instanceof Error ? {
          message: fetchError.message,
          stack: fetchError.stack
        } : String(fetchError),
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ 
        error: 'Failed to connect to authentication service',
        details: fetchError instanceof Error ? fetchError.message : 'Network error'
      }, { status: 500 });
    }

    // Log raw response for debugging
    const responseText = await response.text();
    console.log(`📦 [${requestId}] Raw Unipile response:`, {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
      timestamp: new Date().toISOString()
    });

    // Parse response data
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`❌ [${requestId}] Failed to parse Unipile response:`, {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        responseText,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ 
        error: 'Invalid response from authentication service',
        details: 'Failed to parse service response',
        raw: responseText
      }, { status: 500 });
    }
    
    if (!response.ok) {
      console.error(`❌ [${requestId}] Unipile error response:`, {
        status: response.status,
        error: responseData,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ 
        error: 'Failed to get connection link',
        details: responseData?.message || responseData?.error || JSON.stringify(responseData),
        status: response.status,
        accountType,
        requestPayload: payload
      }, { status: response.status });
    }

    if (!responseData?.url) {
      console.error(`❌ [${requestId}] Missing URL in successful response:`, {
        responseData,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ 
        error: 'Invalid response from authentication service',
        details: 'No connection URL provided'
      }, { status: 500 });
    }

    console.log(`✅ [${requestId}] Successfully created connection link:`, {
      accountType,
      hasUrl: true,
      pendingAccountId,
      timestamp: new Date().toISOString()
    });

    // Return both the Unipile URL and our pending account ID
    return NextResponse.json({
      ...responseData,
      pendingAccountId
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Error in /api/accounts/connect:`, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : String(error),
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 