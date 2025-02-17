import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Unipile configuration - use production URL
const UNIPILE_API_URL = 'https://api4.unipile.com:13465';
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;

export async function POST(request: Request) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const accountType = body.accountType?.toUpperCase();
    
    // Validate account type
    if (accountType !== 'LINKEDIN' && accountType !== 'EMAIL') {
      return NextResponse.json({ 
        error: 'Invalid account type',
        details: 'Account type must be either LINKEDIN or EMAIL'
      }, { status: 400 });
    }

    // Get application URL
    const appUrl = process.env.NODE_ENV === 'production'
      ? 'https://app.messagelm.com'
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create minimal payload
    const payload = {
      type: "create",
      providers: accountType === 'LINKEDIN' ? ["LINKEDIN"] : ["GOOGLE"],
      api_url: UNIPILE_API_URL,
      oauth_url: 'https://api4.unipile.com',  // Base URL for OAuth
      notify_url: `${appUrl}/api/webhooks/unipile`,
      success_redirect_url: `${appUrl}/accounts?success=true`,
      failure_redirect_url: `${appUrl}/accounts?error=true`,
      name: `org_${session.user.organizationId}_${accountType}_${Date.now()}`
    };

    // Make request to Unipile
    const response = await fetch(`${UNIPILE_API_URL}/api/v1/hosted/accounts/link`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-KEY': UNIPILE_API_KEY!
      },
      body: JSON.stringify(payload)
    });

    // Handle response
    const responseData = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Failed to get connection link',
        details: responseData
      }, { status: response.status });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in /api/accounts/connect:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 