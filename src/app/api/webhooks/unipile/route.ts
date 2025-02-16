import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Log module initialization with more details
console.log('🚀 Initializing Unipile webhook handler:', {
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV,
  handler: 'unipile-webhook',
  database_url_type: process.env.DATABASE_URL?.includes('pooled') ? 'pooled' : 'unpooled',
  node_version: process.version
});

// Configure Unipile URLs based on environment
const UNIPILE_BASE_DSN = process.env.UNIPILE_DSN?.split(':')[0] || 'api4.unipile.com';  // Base DSN without port
const UNIPILE_FULL_DSN = process.env.UNIPILE_DSN || 'api4.unipile.com:13465';  // Full DSN with port
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;

// Production URL configuration - ensure no trailing slashes
const PRODUCTION_URL = 'https://app.messagelm.com';
const APP_URL = process.env.NODE_ENV === 'production' ? PRODUCTION_URL : process.env.NEXT_PUBLIC_APP_URL;
const WEBHOOK_URL = `${APP_URL}/api/webhooks/unipile`.replace(/\/$/, '');

// Log configuration on module load
console.log('🌍 Webhook handler configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  APP_URL,
  UNIPILE_BASE_DSN,
  UNIPILE_FULL_DSN,
  UNIPILE_API_URL: `https://${UNIPILE_FULL_DSN}`,
  UNIPILE_OAUTH_URL: `https://${UNIPILE_BASE_DSN}`,
  WEBHOOK_URL,
  hasApiKey: !!UNIPILE_API_KEY,
  timestamp: new Date().toISOString()
});

// Define webhook data schema for account status updates
const UnipileAccountStatus = z.object({
  AccountStatus: z.object({
    account_id: z.string(),
    account_type: z.string(),
    message: z.string()
  })
});

// Define Unipile account details schema
const UnipileAccountDetails = z.object({
  object: z.literal('Account'),
  id: z.string(),
  name: z.string(),
  type: z.string(),
  created_at: z.string(),
  connection_params: z.object({
    mail: z.object({
      id: z.string(),
      username: z.string().optional(),
      email: z.string().optional()
    }).optional(),
    im: z.object({
      id: z.string(),
      username: z.string()
    }).optional()
  }),
  sources: z.array(
    z.object({
      id: z.string(),
      status: z.string()
    })
  )
});

type UnipileAccountStatusData = z.infer<typeof UnipileAccountStatus>;
type UnipileAccountDetailsData = z.infer<typeof UnipileAccountDetails>;

// Constants for unassigned organization
const UNASSIGNED_ORG_ID = 'cm78a5qs00000ha6e89p5tgm4';  // Fixed ID for unassigned organization
const UNASSIGNED_ORG_NAME = 'Unassigned Accounts';

// Function to ensure unassigned organization exists
async function ensureUnassignedOrganization(): Promise<string> {
  const orgId = UNASSIGNED_ORG_ID;
  
  try {
    const existing = await prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!existing) {
      const created = await prisma.organization.create({
        data: {
          id: orgId,
          name: UNASSIGNED_ORG_NAME,
          webhookUrl: `unassigned-${Date.now()}`,
        }
      });
      console.log('✅ Created unassigned organization:', created);
      return created.id;
    }

    return existing.id;
  } catch (error) {
    console.error('❌ Error ensuring unassigned organization:', error);
    throw error;
  }
}

// Function to save email account with fallback to unassigned organization
async function saveEmailAccountWithFallback(
  email: string,
  preferredOrgId: string | null,
  unipileAccountId: string,
  requestId: string
): Promise<any> {
  try {
    // Try to use preferred organization if provided
    if (preferredOrgId) {
      const org = await prisma.organization.findUnique({
        where: { id: preferredOrgId }
      });
      
      if (org) {
        console.log(`🏢 [${requestId}] Using preferred organization:`, {
          id: org.id,
          name: org.name
        });
        
        return await saveEmailAccount(email, org.id, unipileAccountId);
      }
    }

    // Fallback to unassigned organization
    console.log(`⚠️ [${requestId}] Using unassigned organization for:`, {
      email,
      unipileAccountId
    });
    
    const unassignedOrgId = await ensureUnassignedOrganization();
    return await saveEmailAccount(email, unassignedOrgId, unipileAccountId);
  } catch (error) {
    console.error(`❌ [${requestId}] Error saving email account:`, error);
    throw error;
  }
}

// Function to fetch and validate account details from Unipile
async function getUnipileAccountDetails(accountId: string): Promise<UnipileAccountDetailsData> {
  const fetchId = Math.random().toString(36).substring(7);
  
  if (!UNIPILE_API_KEY) {
    console.error(`❌ [${fetchId}] Missing UNIPILE_API_KEY`);
    throw new Error('Missing UNIPILE_API_KEY');
  }

  const apiUrl = `https://${UNIPILE_FULL_DSN}/api/v1/accounts/${accountId}`;
  console.log(`🔍 [${fetchId}] Fetching Unipile account details:`, { 
    accountId,
    apiUrl,
    timestamp: new Date().toISOString()
  });

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': UNIPILE_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${fetchId}] Failed to fetch account details:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to fetch account details: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📦 [${fetchId}] Raw account details:`, {
      data,
      timestamp: new Date().toISOString()
    });

    return UnipileAccountDetails.parse(data);
  } catch (error) {
    console.error(`❌ [${fetchId}] Error fetching account details:`, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Function to save email account
async function saveEmailAccount(email: string, organizationId: string, unipileAccountId: string) {
  const saveId = Math.random().toString(36).substring(7);
  console.log(`📧 [${saveId}] Saving email account:`, { 
    email, 
    organizationId, 
    unipileAccountId,
    timestamp: new Date().toISOString()
  });

  try {
    const result = await prisma.emailAccount.upsert({
      where: { unipileAccountId },
      create: {
        email,
        name: email,
        organizationId,
        unipileAccountId,
        isActive: true
      },
      update: {
        email,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [${saveId}] Email account saved:`, {
      id: result.id,
      email: result.email,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error(`❌ [${saveId}] Error saving email account:`, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Function to save social account
async function saveSocialAccount(username: string, organizationId: string, unipileAccountId: string, provider: string) {
  console.log('👥 Saving social account:', { username, organizationId, unipileAccountId, provider });
  
  return await prisma.socialAccount.upsert({
    where: { unipileAccountId },
    create: {
      username,
      name: username,
      provider,
      organizationId,
      unipileAccountId,
      isActive: true
    },
    update: {
      username,
      updatedAt: new Date()
    }
  });
}

// Function to update account status in database
async function updateAccountStatus(accountId: string, accountType: string, status: string) {
  const updateId = Math.random().toString(36).substring(7);
  console.log(`🔄 [${updateId}] Updating account status:`, {
    accountId,
    accountType,
    status,
    timestamp: new Date().toISOString()
  });

  try {
    if (accountType.toUpperCase().includes('MAIL') || accountType.toUpperCase() === 'GMAIL' || accountType.toUpperCase() === 'OUTLOOK') {
      // Update email account
      const result = await prisma.emailAccount.updateMany({
        where: { unipileAccountId: accountId },
        data: {
          isActive: status === 'OK' || status === 'CREATION_SUCCESS' || status === 'RECONNECTED',
          updatedAt: new Date()
        }
      });
      console.log(`📧 [${updateId}] Updated email account status:`, {
        accountId,
        status,
        affected: result.count,
        timestamp: new Date().toISOString()
      });
    } else {
      // Update social account
      const result = await prisma.socialAccount.updateMany({
        where: { unipileAccountId: accountId },
        data: {
          isActive: status === 'OK' || status === 'CREATION_SUCCESS' || status === 'RECONNECTED',
          updatedAt: new Date()
        }
      });
      console.log(`👥 [${updateId}] Updated social account status:`, {
        accountId,
        status,
        affected: result.count,
        timestamp: new Date().toISOString()
      });
    }
    return true;
  } catch (error) {
    console.error(`❌ [${updateId}] Failed to update account status:`, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : String(error),
      accountId,
      accountType,
      status,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

// Function to extract organization ID from encoded name
function extractOrganizationId(name: string): string | null {
  if (!name.startsWith('org_')) {
    console.error('❌ Invalid organization ID format:', { name });
    return null;
  }
  return name.replace('org_', '');
}

// Function to validate Google OAuth account details
function validateGoogleOAuthAccount(details: UnipileAccountDetailsData, requestId: string): { 
  isValid: boolean; 
  email?: string; 
  error?: string; 
} {
  console.log(`🔍 [${requestId}] Validating Google OAuth account:`, {
    id: details.id,
    type: details.type,
    hasMailParams: !!details.connection_params.mail,
    timestamp: new Date().toISOString()
  });

  // For Google OAuth, we expect mail params with email
  if (!details.connection_params.mail) {
    console.error(`❌ [${requestId}] Missing mail parameters for Google OAuth account:`, {
      id: details.id,
      type: details.type,
      connection_params: details.connection_params,
      timestamp: new Date().toISOString()
    });
    return { 
      isValid: false, 
      error: 'Missing mail parameters for Google OAuth account' 
    };
  }

  const email = details.connection_params.mail.email;
  if (!email) {
    console.error(`❌ [${requestId}] Missing email for Google OAuth account:`, {
      id: details.id,
      type: details.type,
      mail_params: details.connection_params.mail,
      timestamp: new Date().toISOString()
    });
    return { 
      isValid: false, 
      error: 'Missing email for Google OAuth account' 
    };
  }

  // Validate email format
  if (!email.includes('@')) {
    console.error(`❌ [${requestId}] Invalid email format:`, {
      id: details.id,
      email,
      timestamp: new Date().toISOString()
    });
    return { 
      isValid: false, 
      error: 'Invalid email format' 
    };
  }

  return { 
    isValid: true, 
    email 
  };
}

// Add test endpoint for webhook verification
export async function GET(req: Request) {
  const testId = Math.random().toString(36).substring(7);
  console.log(`🧪 [${testId}] Test endpoint hit:`, {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    timestamp: new Date().toISOString()
  });
  
  return NextResponse.json({
    status: 'success',
    message: 'Webhook endpoint is reachable',
    testId,
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  console.log(`🔔 [${requestId}] Webhook received:`, {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    timestamp: new Date().toISOString()
  });

  try {
    // Read and log raw body
    const rawBody = await req.text();
    console.log(`📦 [${requestId}] Raw webhook body:`, {
      body: rawBody,
      timestamp: new Date().toISOString()
    });

    // Parse webhook data
    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (parseError) {
      console.error(`❌ [${requestId}] JSON parse error:`, {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        rawBody,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({
        status: 'error',
        message: 'Invalid JSON in webhook body'
      }, { status: 400 });
    }

    // Validate webhook data
    const validationResult = UnipileAccountStatus.safeParse(webhookData);
    if (!validationResult.success) {
      console.error(`❌ [${requestId}] Invalid webhook format:`, {
        errors: validationResult.error.issues,
        data: webhookData,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({
        status: 'error',
        message: 'Invalid webhook format',
        errors: validationResult.error.issues
      }, { status: 400 });
    }

    const { account_id, message, account_type } = webhookData.AccountStatus;

    // Handle account creation success
    if (message === 'CREATION_SUCCESS') {
      try {
        // Fetch account details from Unipile
        const accountDetails = await getUnipileAccountDetails(account_id);
        
        // Log full account details for debugging
        console.log(`📦 [${requestId}] Parsed account details:`, {
          id: accountDetails.id,
          type: accountDetails.type,
          name: accountDetails.name,
          connection_params: accountDetails.connection_params,
          timestamp: new Date().toISOString()
        });

        // Special handling for Google OAuth accounts
        if (account_type.toUpperCase() === 'GOOGLE_OAUTH') {
          const validation = validateGoogleOAuthAccount(accountDetails, requestId);
          if (!validation.isValid) {
            console.error(`❌ [${requestId}] Google OAuth validation failed:`, {
              error: validation.error,
              accountId: account_id,
              timestamp: new Date().toISOString()
            });
            return NextResponse.json({
              status: 'error',
              message: validation.error,
              details: {
                accountId: account_id,
                accountType: account_type,
                validationError: validation.error
              }
            }, { status: 400 });
          }

          // Use validated email
          const emailAccount = await saveEmailAccountWithFallback(
            validation.email!,
            accountDetails.name?.startsWith('org_') ? extractOrganizationId(accountDetails.name) : null,
            accountDetails.id,
            requestId
          );

          return NextResponse.json({
            status: 'success',
            message: 'Email account created',
            data: {
              accountId: emailAccount.id,
              email: emailAccount.email,
              organizationId: emailAccount.organizationId,
              isUnassigned: emailAccount.organizationId === UNASSIGNED_ORG_ID,
              processingTime: Date.now() - startTime
            }
          });
        }

        // Handle other account types
        if (accountDetails.connection_params.mail?.email) {
          const emailAccount = await saveEmailAccountWithFallback(
            accountDetails.connection_params.mail.email,
            accountDetails.name?.startsWith('org_') ? extractOrganizationId(accountDetails.name) : null,
            accountDetails.id,
            requestId
          );

          return NextResponse.json({
            status: 'success',
            message: 'Email account created',
            data: {
              accountId: emailAccount.id,
              email: emailAccount.email,
              organizationId: emailAccount.organizationId,
              isUnassigned: emailAccount.organizationId === UNASSIGNED_ORG_ID,
              processingTime: Date.now() - startTime
            }
          });
        }

        // No valid email found
        console.error(`❌ [${requestId}] No valid email found in account details:`, {
          accountId: account_id,
          accountType: account_type,
          connection_params: accountDetails.connection_params,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({
          status: 'error',
          message: 'No valid email found in account details',
          details: {
            accountId: account_id,
            accountType: account_type,
            hasMailParams: !!accountDetails.connection_params.mail,
            timestamp: new Date().toISOString()
          }
        }, { status: 400 });
      } catch (error) {
        console.error(`❌ [${requestId}] Error processing account creation:`, {
          error: error instanceof Error ? error.message : String(error),
          accountId: account_id,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({
          status: 'error',
          message: 'Error processing account creation',
          error: error instanceof Error ? error.message : String(error),
          details: {
            accountId: account_id,
            accountType: account_type,
            timestamp: new Date().toISOString()
          }
        }, { status: 500 });
      }
    }

    // For other status updates, just acknowledge receipt
    return NextResponse.json({
      status: 'success',
      message: 'Webhook received',
      data: {
        accountId: account_id,
        status: message,
        type: account_type,
        processingTime: Date.now() - startTime
      }
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Error processing webhook:`, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({
      status: 'error',
      message: 'Error processing webhook',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}