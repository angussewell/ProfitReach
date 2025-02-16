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

// Constants for retry logic
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 5000;
const MAX_RETRY_DELAY = 20000;

// Constants for webhook processing
const WEBHOOK_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
} as const;

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to calculate exponential backoff delay
function getRetryDelay(attempt: number): number {
  const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
  return delay + (Math.random() * 1000); // Add jitter
}

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

// Function to verify database connectivity
async function verifyDatabaseConnection(requestId: string): Promise<boolean> {
  try {
    // Try a simple query to verify connection
    await prisma.$queryRaw`SELECT 1`;
    console.log(`✅ [${requestId}] Database connection verified`);
    return true;
  } catch (error) {
    console.error(`❌ [${requestId}] Database connection failed:`, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

// Combined function to fetch and validate account details
async function getValidatedAccountDetails(
  accountId: string,
  accountType: string,
  requestId: string
): Promise<{
  status: 'success' | 'processing' | 'error';
  accountDetails?: UnipileAccountDetailsData;
  email?: string;
  error?: string;
  shouldRetry?: boolean;
}> {
  let lastError: Error | null = null;
  
  // Initial delay for account provisioning
  await wait(INITIAL_RETRY_DELAY);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const apiUrl = `https://${UNIPILE_FULL_DSN}/api/v1/accounts/${accountId}`;
      console.log(`🔍 [${requestId}] Fetching account details (attempt ${attempt + 1}/${MAX_RETRIES}):`, { 
        accountId,
        accountType,
        apiUrl,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': UNIPILE_API_KEY!,
        },
      });

      const responseText = await response.text();
      console.log(`📦 [${requestId}] Raw response (attempt ${attempt + 1}):`, {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
        timestamp: new Date().toISOString()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch account details: ${response.status} ${response.statusText} - ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : String(error)}`);
      }

      const accountDetails = UnipileAccountDetails.parse(data);
      
      // For Google OAuth accounts, validate email
      if (accountType.toUpperCase() === 'GOOGLE_OAUTH') {
        if (!accountDetails.connection_params.mail) {
          console.log(`⏳ [${requestId}] Mail parameters not yet available (attempt ${attempt + 1})`);
          if (attempt < MAX_RETRIES - 1) {
            const delay = getRetryDelay(attempt);
            await wait(delay);
            continue;
          }
          return {
            status: 'error',
            error: 'Missing mail parameters for Google OAuth account',
            shouldRetry: false
          };
        }

        const email = accountDetails.connection_params.mail.email;
        if (!email) {
          console.log(`⏳ [${requestId}] Email not yet available (attempt ${attempt + 1})`);
          if (attempt < MAX_RETRIES - 1) {
            const delay = getRetryDelay(attempt);
            await wait(delay);
            continue;
          }
          return {
            status: 'error',
            error: 'Missing email for Google OAuth account',
            shouldRetry: false
          };
        }

        if (!email.includes('@')) {
          return {
            status: 'error',
            error: 'Invalid email format',
            shouldRetry: false
          };
        }

        return {
          status: 'success',
          accountDetails,
          email
        };
      }

      // For other account types
      return {
        status: 'success',
        accountDetails
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ [${requestId}] Error fetching/validating account (attempt ${attempt + 1}):`, {
        error: lastError.message,
        stack: lastError.stack,
        timestamp: new Date().toISOString()
      });

      if (attempt < MAX_RETRIES - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`⏳ [${requestId}] Retrying in ${delay}ms...`);
        await wait(delay);
      }
    }
  }

  return {
    status: 'error',
    error: lastError?.message || 'Failed to fetch and validate account details after all retries',
    shouldRetry: false
  };
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

// Function to store webhook data
async function storeWebhook(
  webhookData: UnipileAccountStatusData,
  requestId: string
): Promise<string> {
  try {
    // Get or create unassigned organization for initial storage
    const organizationId = await ensureUnassignedOrganization();
    
    // Store webhook data
    const webhookLog = await prisma.webhookLog.create({
      data: {
        accountId: webhookData.AccountStatus.account_id,
        organizationId,
        status: WEBHOOK_STATUS.PENDING,
        scenarioName: 'Account Creation',
        requestBody: webhookData,
        responseBody: {},
      }
    });

    console.log(`📝 [${requestId}] Stored webhook:`, {
      id: webhookLog.id,
      status: webhookLog.status,
      timestamp: new Date().toISOString()
    });

    return webhookLog.id;
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to store webhook:`, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Function to process webhook asynchronously
async function processWebhook(
  webhookId: string,
  webhookData: UnipileAccountStatusData,
  requestId: string
) {
  try {
    // Update status to processing
    await prisma.webhookLog.update({
      where: { id: webhookId },
      data: { 
        status: WEBHOOK_STATUS.PROCESSING
      }
    });

    const { account_id, message, account_type } = webhookData.AccountStatus;

    // Only process creation success messages
    if (message === 'CREATION_SUCCESS') {
      // Fetch and validate account details
      const result = await getValidatedAccountDetails(account_id, account_type, requestId);
      
      if (result.status === 'error') {
        await prisma.webhookLog.update({
          where: { id: webhookId },
          data: {
            status: WEBHOOK_STATUS.ERROR,
            responseBody: { error: result.error }
          }
        });
        return;
      }

      if (!result.accountDetails) {
        await prisma.webhookLog.update({
          where: { id: webhookId },
          data: {
            status: WEBHOOK_STATUS.ERROR,
            responseBody: { error: 'No account details available' }
          }
        });
        return;
      }

      // Handle Google OAuth accounts
      if (account_type.toUpperCase() === 'GOOGLE_OAUTH') {
        if (!result.email) {
          await prisma.webhookLog.update({
            where: { id: webhookId },
            data: {
              status: WEBHOOK_STATUS.ERROR,
              responseBody: { error: 'No email available for Google OAuth account' }
            }
          });
          return;
        }

        const emailAccount = await saveEmailAccountWithFallback(
          result.email,
          result.accountDetails.name?.startsWith('org_') ? extractOrganizationId(result.accountDetails.name) : null,
          result.accountDetails.id,
          requestId
        );

        // Update webhook log with success
        await prisma.webhookLog.update({
          where: { id: webhookId },
          data: {
            status: WEBHOOK_STATUS.SUCCESS,
            organizationId: emailAccount.organizationId,
            responseBody: {
              accountId: emailAccount.id,
              email: emailAccount.email,
              organizationId: emailAccount.organizationId
            }
          }
        });
      }
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Error processing webhook:`, {
      error: error instanceof Error ? error.message : String(error),
      webhookId,
      timestamp: new Date().toISOString()
    });

    // Update webhook log with error
    await prisma.webhookLog.update({
      where: { id: webhookId },
      data: {
        status: WEBHOOK_STATUS.ERROR,
        responseBody: { 
          error: error instanceof Error ? error.message : String(error)
        }
      }
    });
  }
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

    // Store webhook immediately
    const webhookId = await storeWebhook(webhookData, requestId);

    // Process webhook asynchronously
    processWebhook(webhookId, webhookData, requestId).catch(error => {
      console.error(`❌ [${requestId}] Async processing error:`, {
        error: error instanceof Error ? error.message : String(error),
        webhookId,
        timestamp: new Date().toISOString()
      });
    });

    // Acknowledge receipt immediately
    return NextResponse.json({
      status: 'success',
      message: 'Webhook received and queued for processing',
      data: {
        webhookId,
        processingTime: Date.now() - startTime
      }
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Error handling webhook:`, {
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