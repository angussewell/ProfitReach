import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Unipile configuration
const UNIPILE_DSN = process.env.UNIPILE_DSN || 'api4.unipile.com:13465';
const [UNIPILE_HOST, UNIPILE_PORT] = UNIPILE_DSN.split(':');

const UNIPILE_CONFIG = {
  API_URL: `https://${UNIPILE_DSN}`,  // Full URL with port for API calls
  OAUTH_URL: `https://${UNIPILE_HOST}`,  // Base URL without port for OAuth
  API_KEY: process.env.UNIPILE_API_KEY
};

// Development fallback URL
const DEV_URL = 'http://localhost:3000';

// Validate URL function
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Function to create placeholder account
async function createPlaceholderAccount(organizationId: string, accountType: string) {
  const timestamp = new Date().toISOString();
  const pendingName = `PENDING_${accountType}_${organizationId}_${timestamp}`;
  
  if (accountType === 'LINKEDIN') {
    // Create placeholder social account
    const account = await prisma.socialAccount.create({
      data: {
        username: '', // Leave blank until we get real data
        name: pendingName,
        provider: 'LINKEDIN',
        organizationId,
        isActive: false
      }
    });
    return { id: account.id, type: 'social' };
  } else {
    // Create placeholder email account
    const account = await prisma.emailAccount.create({
      data: {
        email: `pending_${timestamp}@placeholder.com`,
        name: pendingName,
        organizationId,
        isActive: false
      }
    });
    return { id: account.id, type: 'email' };
  }
}

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    // Log initial configuration with URL validation
    console.log(`🔧 [${requestId}] Configuration:`, {
      UNIPILE_DSN,
      UNIPILE_HOST,
      API_URL: UNIPILE_CONFIG.API_URL,
      OAUTH_URL: UNIPILE_CONFIG.OAUTH_URL,
      hasApiKey: !!UNIPILE_CONFIG.API_KEY,
      environment: process.env.NODE_ENV,
      isValidApiUrl: isValidUrl(UNIPILE_CONFIG.API_URL),
      isValidOauthUrl: isValidUrl(UNIPILE_CONFIG.OAUTH_URL)
    });

    // Validate URLs
    if (!isValidUrl(UNIPILE_CONFIG.API_URL) || !isValidUrl(UNIPILE_CONFIG.OAUTH_URL)) {
      console.error(`❌ [${requestId}] Invalid Unipile URLs configured`);
      return NextResponse.json({ 
        error: 'Configuration error',
        details: 'Invalid Unipile URLs'
      }, { status: 500 });
    }

    // Check for API key
    if (!UNIPILE_CONFIG.API_KEY) {
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

    // Create placeholder account
    console.log(`📝 [${requestId}] Creating placeholder account:`, {
      organizationId: session.user.organizationId,
      accountType
    });

    const placeholderAccount = await createPlaceholderAccount(
      session.user.organizationId,
      accountType
    );

    console.log(`✅ [${requestId}] Created placeholder account:`, {
      id: placeholderAccount.id,
      type: placeholderAccount.type
    });

    // Get application URL (use HTTP for local development)
    const appUrl = process.env.NODE_ENV === 'production'
      ? 'https://app.messagelm.com'
      : process.env.NEXT_PUBLIC_APP_URL || DEV_URL;

    // Encode context in name field
    // Format: org_[orgId]_type_[accountType]_account_[accountId]
    const contextName = `org_${session.user.organizationId}_type_${accountType}_account_${placeholderAccount.id}`;

    // Create minimal payload matching docs exactly
    const payload = {
      type: "create",
      providers: accountType === 'LINKEDIN' ? ["LINKEDIN"] : ["GOOGLE"],
      api_url: UNIPILE_CONFIG.API_URL,
      oauth_url: UNIPILE_CONFIG.OAUTH_URL,  // Use base URL without port for OAuth
      expiresOn: new Date(Date.now() + 3600000).toISOString(),
      notify_url: `${appUrl}/api/webhooks/unipile`,
      name: contextName,
      success_redirect_url: `${appUrl}/accounts?success=true`,
      failure_redirect_url: `${appUrl}/accounts?error=true`
    };

    // Log full request details for debugging
    console.log(`📤 [${requestId}] Unipile request:`, {
      url: `${UNIPILE_CONFIG.API_URL}/api/v1/hosted/accounts/link`,
      method: 'POST',
      organizationId: session.user.organizationId,
      accountType,
      placeholderAccountId: placeholderAccount.id,
      appUrl,
      payload: {
        ...payload,
        name: '[REDACTED]'
      }
    });

    let response;
    try {
      // Make request to Unipile
      const apiUrl = `${UNIPILE_CONFIG.API_URL}/api/v1/hosted/accounts/link`;
      console.log(`🔗 [${requestId}] Making request to:`, { apiUrl });
      
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-KEY': UNIPILE_CONFIG.API_KEY
        },
        body: JSON.stringify(payload)
      });
    } catch (fetchError) {
      // Clean up placeholder account on error
      if (placeholderAccount.type === 'social') {
        await prisma.socialAccount.delete({
          where: { id: placeholderAccount.id }
        });
      } else {
        await prisma.emailAccount.delete({
          where: { id: placeholderAccount.id }
        });
      }

      console.error(`❌ [${requestId}] Fetch error:`, {
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
        stack: fetchError instanceof Error ? fetchError.stack : undefined
      });
      return NextResponse.json({ 
        error: 'Failed to connect to Unipile',
        details: fetchError instanceof Error ? fetchError.message : 'Network error'
      }, { status: 500 });
    }

    // Clone response for logging
    const responseClone = response.clone();

    try {
      // Get response as text first for logging
      const responseText = await responseClone.text();
      console.log(`📥 [${requestId}] Raw Unipile response:`, {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
        contentType: response.headers.get('content-type')
      });

      if (!response.ok) {
        // Try to parse error response as JSON
        let errorDetails = responseText;
        try {
          const errorJson = JSON.parse(responseText);
          errorDetails = errorJson.error || errorJson.message || responseText;
        } catch {
          // If parsing fails, use the raw text
          console.log(`⚠️ [${requestId}] Could not parse error response as JSON`);
        }

        // Clean up placeholder account on error
        if (placeholderAccount.type === 'social') {
          await prisma.socialAccount.delete({
            where: { id: placeholderAccount.id }
          });
        } else {
          await prisma.emailAccount.delete({
            where: { id: placeholderAccount.id }
          });
        }

        return NextResponse.json({ 
          error: 'Failed to get connection link',
          details: errorDetails,
          status: response.status
        }, { status: response.status });
      }

      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // Clean up placeholder account on error
        if (placeholderAccount.type === 'social') {
          await prisma.socialAccount.delete({
            where: { id: placeholderAccount.id }
          });
        } else {
          await prisma.emailAccount.delete({
            where: { id: placeholderAccount.id }
          });
        }

        console.error(`❌ [${requestId}] JSON parse error:`, {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          responseText
        });
        return NextResponse.json({ 
          error: 'Invalid response from Unipile',
          details: 'Response was not valid JSON'
        }, { status: 500 });
      }

      // Add placeholder account ID to response
      return NextResponse.json({
        ...data,
        placeholderAccountId: placeholderAccount.id,
        accountType: placeholderAccount.type
      });
    } catch (responseError) {
      // Clean up placeholder account on error
      if (placeholderAccount.type === 'social') {
        await prisma.socialAccount.delete({
          where: { id: placeholderAccount.id }
        });
      } else {
        await prisma.emailAccount.delete({
          where: { id: placeholderAccount.id }
        });
      }

      console.error(`❌ [${requestId}] Response handling error:`, {
        message: responseError instanceof Error ? responseError.message : String(responseError),
        stack: responseError instanceof Error ? responseError.stack : undefined
      });
      return NextResponse.json({ 
        error: 'Error processing response',
        details: responseError instanceof Error ? responseError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Error:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
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