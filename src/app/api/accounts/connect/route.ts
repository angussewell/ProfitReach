import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Simple configuration
const UNIPILE_API_URL = 'https://api4.unipile.com';
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    // Check for API key
    if (!UNIPILE_API_KEY) {
      console.error(`❌ [${requestId}] Missing UNIPILE_API_KEY`);
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      console.error(`❌ [${requestId}] No session found`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const accountType = body.accountType?.toUpperCase() || 'EMAIL';

    // Set up redirect URLs
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://app.messagelm.com'
      : process.env.NEXT_PUBLIC_APP_URL;

    // Create minimal payload exactly matching docs
    const payload = {
      type: "create",
      providers: accountType === 'LINKEDIN' ? ["linkedin"] : ["GOOGLE"],
      api_url: UNIPILE_API_URL,
      oauth_url: UNIPILE_API_URL,
      expiresOn: new Date(Date.now() + 3600000).toISOString(),
      notify_url: `${baseUrl}/api/webhooks/unipile`,
      name: `org_${session.user.organizationId}`,
      success_redirect_url: `${baseUrl}/accounts?success=true`,
      failure_redirect_url: `${baseUrl}/accounts?error=true`
    };

    // Log request (minimal logging)
    console.log(`📤 [${requestId}] Requesting auth link:`, {
      organizationId: session.user.organizationId,
      accountType
    });

    // Make request to Unipile
    const response = await fetch(`${UNIPILE_API_URL}/api/v1/hosted/accounts/link`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-KEY': UNIPILE_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ [${requestId}] Unipile error:`, {
        status: response.status,
        error
      });
      return NextResponse.json({ error: 'Failed to get connection link' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`❌ [${requestId}] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 