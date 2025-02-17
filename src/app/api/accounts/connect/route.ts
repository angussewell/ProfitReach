import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Unipile configuration
const UNIPILE_API_URL = 'https://api4.unipile.com:13465';
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;

// Provider mapping for different account types
const PROVIDER_MAP = {
  EMAIL: ['GOOGLE', 'OUTLOOK', 'MAIL'],  // Match example payload exactly
  LINKEDIN: ['LINKEDIN']
} as const;

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🔄 [${requestId}] Account connection request:`, {
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString()
  });

  try {
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
    const body = await request.json();
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

    // Set expiration to 24 hours from now in correct ISO format
    const expiresOn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Create payload matching Unipile's schema exactly
    const payload = {
      type: "create",
      providers: PROVIDER_MAP[accountType as keyof typeof PROVIDER_MAP],
      api_url: UNIPILE_API_URL,
      expiresOn,
      name: `org_${session.user.organizationId}_${accountType}_${Date.now()}`
    };

    console.log(`🔗 [${requestId}] Creating connection link:`, {
      accountType,
      payload,
      timestamp: new Date().toISOString()
    });

    // Make request to Unipile
    const response = await fetch(`${UNIPILE_API_URL}/api/v1/hosted/accounts/link`, {
      method: 'POST',
      headers: {
        'X-API-KEY': UNIPILE_API_KEY!,
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

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
        details: 'Failed to parse service response'
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
        accountType,
        requestPayload: payload
      }, { status: response.status });
    }

    console.log(`✅ [${requestId}] Successfully created connection link:`, {
      accountType,
      hasUrl: !!responseData.url,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(responseData);
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