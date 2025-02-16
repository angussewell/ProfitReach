import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Log module initialization
console.log('🚀 Initializing Unipile webhook handler:', {
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV,
  handler: 'unipile-webhook'
});

// Configure Unipile URLs based on environment
const UNIPILE_DSN = process.env.UNIPILE_DSN || 'api4.unipile.com';  // Removed port number
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;

// Production URL configuration
const PRODUCTION_URL = 'https://app.messagelm.com';
const APP_URL = process.env.NODE_ENV === 'production' ? PRODUCTION_URL : process.env.NEXT_PUBLIC_APP_URL;

// Separate API and webhook URLs - using HTTPS without port for production
const UNIPILE_API_URL = `https://${UNIPILE_DSN}`;
const WEBHOOK_URL = `${APP_URL}/api/webhooks/unipile`;

// Log configuration on module load
console.log('🌍 Webhook handler configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  APP_URL,
  UNIPILE_DSN,
  UNIPILE_API_URL,
  WEBHOOK_URL,
  hasApiKey: !!UNIPILE_API_KEY,
  timestamp: new Date().toISOString()
});

// Define webhook data schema
const UnipileAccountWebhook = z.object({
  status: z.enum(['CREATION_SUCCESS', 'RECONNECTED']),
  account_id: z.string(),
  name: z.string()
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

type UnipileAccountData = z.infer<typeof UnipileAccountWebhook>;
type UnipileAccountDetailsData = z.infer<typeof UnipileAccountDetails>;

// Function to fetch and validate account details from Unipile
async function getUnipileAccountDetails(accountId: string): Promise<UnipileAccountDetailsData> {
  const fetchId = Math.random().toString(36).substring(7);
  
  if (!UNIPILE_API_KEY) {
    console.error(`❌ [${fetchId}] Missing UNIPILE_API_KEY`);
    throw new Error('Missing UNIPILE_API_KEY');
  }

  const apiUrl = `${UNIPILE_API_URL}/api/v1/accounts/${accountId}`;
  console.log(`🔍 [${fetchId}] Fetching Unipile account details:`, { 
    accountId,
    apiUrl,
    timestamp: new Date().toISOString()
  });

  try {
    // Test API connectivity first
    console.log(`🔄 [${fetchId}] Testing API connectivity:`, {
      url: UNIPILE_API_URL,
      timestamp: new Date().toISOString()
    });

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': UNIPILE_API_KEY,
      },
    });

    // Log detailed response information
    console.log(`📡 [${fetchId}] Unipile API response:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      timestamp: new Date().toISOString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${fetchId}] Failed to fetch account details:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: apiUrl,
        timestamp: new Date().toISOString(),
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Failed to fetch account details: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const rawData = await response.json();
    console.log(`📦 [${fetchId}] Raw Unipile account details:`, {
      data: rawData,
      timestamp: new Date().toISOString()
    });

    try {
      const accountDetails = UnipileAccountDetails.parse(rawData);
      console.log(`✅ [${fetchId}] Validated account details:`, {
        id: accountDetails.id,
        type: accountDetails.type,
        hasMailParams: !!accountDetails.connection_params.mail,
        hasImParams: !!accountDetails.connection_params.im,
        timestamp: new Date().toISOString()
      });
      return accountDetails;
    } catch (parseError) {
      console.error(`❌ [${fetchId}] Invalid account details format:`, {
        error: parseError instanceof Error ? {
          message: parseError.message,
          stack: parseError.stack
        } : String(parseError),
        data: rawData,
        timestamp: new Date().toISOString()
      });
      throw new Error('Invalid account details format from Unipile');
    }
  } catch (error) {
    console.error(`❌ [${fetchId}] Error fetching account details:`, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
      url: apiUrl,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Function to save email account
async function saveEmailAccount(email: string, organizationId: string, unipileAccountId: string) {
  const saveId = Math.random().toString(36).substring(7);
  console.log(`📧 [${saveId}] Starting email account save:`, { 
    email, 
    organizationId, 
    unipileAccountId,
    timestamp: new Date().toISOString()
  });
  
  try {
    // First check if account exists by unipileAccountId
    console.log(`📧 [${saveId}] Checking for existing account by unipileAccountId`);
    const existingByUnipileId = await prisma.emailAccount.findUnique({
      where: { unipileAccountId }
    });
    console.log(`📧 [${saveId}] Existing account check (by unipileAccountId):`, { 
      exists: !!existingByUnipileId,
      id: existingByUnipileId?.id,
      email: existingByUnipileId?.email,
      constraints: {
        unipileAccountId,
        organizationId
      }
    });

    // Then check if email exists in this organization
    console.log(`📧 [${saveId}] Checking for existing account by email in organization`);
    const existingByEmail = await prisma.emailAccount.findFirst({
      where: {
        email,
        organizationId
      }
    });
    console.log(`📧 [${saveId}] Existing account check (by email in org):`, {
      exists: !!existingByEmail,
      id: existingByEmail?.id,
      unipileAccountId: existingByEmail?.unipileAccountId,
      constraints: {
        email,
        organizationId
      }
    });

    // If email exists in org but with different unipileAccountId, we need to handle this
    if (existingByEmail && existingByEmail.unipileAccountId !== unipileAccountId) {
      console.log(`📧 [${saveId}] Email exists in organization with different unipileAccountId:`, {
        existingId: existingByEmail.id,
        existingUnipileId: existingByEmail.unipileAccountId,
        newUnipileId: unipileAccountId,
        action: 'updating_existing'
      });
      
      try {
        // Update the existing account with the new unipileAccountId
        const result = await prisma.emailAccount.update({
          where: { id: existingByEmail.id },
          data: {
            unipileAccountId,
            updatedAt: new Date()
          }
        });
        
        console.log(`📧 [${saveId}] Updated existing email account:`, {
          id: result.id,
          email: result.email,
          unipileAccountId: result.unipileAccountId,
          organizationId: result.organizationId,
          action: 'update_successful'
        });
        
        return result;
      } catch (updateError) {
        console.error(`📧 [${saveId}] Failed to update existing account:`, {
          error: updateError instanceof Error ? {
            message: updateError.message,
            stack: updateError.stack,
            name: updateError.name
          } : String(updateError),
          existingId: existingByEmail.id,
          action: 'update_failed'
        });
        throw updateError;
      }
    }

    // Otherwise, proceed with normal upsert
    console.log(`📧 [${saveId}] Proceeding with upsert operation:`, {
      where: { unipileAccountId },
      email,
      organizationId,
      action: 'upserting'
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
      
      console.log(`📧 [${saveId}] Email account saved successfully:`, {
        id: result.id,
        email: result.email,
        unipileAccountId: result.unipileAccountId,
        organizationId: result.organizationId,
        isActive: result.isActive,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        action: 'upsert_successful'
      });
      
      return result;
    } catch (upsertError) {
      console.error(`📧 [${saveId}] Upsert operation failed:`, {
        error: upsertError instanceof Error ? {
          message: upsertError.message,
          stack: upsertError.stack,
          name: upsertError.name
        } : String(upsertError),
        constraints: {
          email,
          organizationId,
          unipileAccountId
        },
        action: 'upsert_failed'
      });
      throw upsertError;
    }
  } catch (error) {
    // Log detailed error information for constraint violations
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`📧 [${saveId}] Prisma error:`, {
        code: error.code,
        message: error.message,
        meta: error.meta,
        target: error.meta?.target,
        action: 'prisma_error'
      });

      if (error.code === 'P2002') {
        console.error(`📧 [${saveId}] Unique constraint violation:`, {
          error: {
            code: error.code,
            message: error.message,
            meta: error.meta
          },
          email,
          organizationId,
          unipileAccountId,
          action: 'constraint_violation'
        });
      }
    }
    
    console.error(`📧 [${saveId}] Error saving email account:`, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
      email,
      organizationId,
      unipileAccountId,
      action: 'save_failed'
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

export async function POST(req: Request) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  // Immediate request logging
  console.log(`🔔 [${requestId}] WEBHOOK RECEIVED - INITIAL REQUEST:`, {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    timestamp: new Date().toISOString(),
    handler: 'unipile-webhook'
  });

  let webhookData;
  let accountDetails;
  let rawBody;
  
  try {
    // Read and log raw body immediately
    rawBody = await req.text();
    console.log(`📝 [${requestId}] RAW WEBHOOK BODY:`, {
      body: rawBody,
      timestamp: new Date().toISOString(),
      bodyLength: rawBody.length
    });

    try {
      const body = JSON.parse(rawBody);
      console.log(`✅ [${requestId}] PARSED WEBHOOK BODY:`, {
        body,
        timestamp: new Date().toISOString()
      });

      // Validate webhook data
      console.log(`🔍 [${requestId}] Validating webhook data...`);
      const validationResult = UnipileAccountWebhook.safeParse(body);
      
      if (!validationResult.success) {
        console.error(`❌ [${requestId}] VALIDATION FAILED:`, {
          error: validationResult.error,
          body,
          timestamp: new Date().toISOString()
        });
        return new NextResponse('Invalid webhook data', { status: 400 });
      }

      webhookData = validationResult.data;
      console.log(`✅ [${requestId}] WEBHOOK DATA VALIDATED:`, {
        data: webhookData,
        timestamp: new Date().toISOString()
      });
    } catch (parseError) {
      console.error(`❌ [${requestId}] PARSE ERROR:`, {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        rawBody,
        timestamp: new Date().toISOString()
      });
      return new NextResponse('Invalid JSON data', { status: 400 });
    }

    // Get account details from Unipile
    try {
      console.log(`🔍 [${requestId}] Fetching account details for:`, webhookData.account_id);
      accountDetails = await getUnipileAccountDetails(webhookData.account_id);
      console.log(`✅ [${requestId}] Account details retrieved:`, {
        id: accountDetails.id,
        type: accountDetails.type,
        connection_params: accountDetails.connection_params
      });
    } catch (unipileError) {
      console.error(`❌ [${requestId}] Failed to fetch account details:`, {
        error: unipileError instanceof Error ? unipileError.message : String(unipileError),
        webhookData
      });
      return new NextResponse('Failed to fetch account details', { status: 500 });
    }

    const organizationId = webhookData.name;

    // Verify organization exists
    try {
      console.log(`🔍 [${requestId}] Verifying organization:`, organizationId);
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!organization) {
        console.error(`❌ [${requestId}] Organization not found:`, { organizationId });
        return new NextResponse('Organization not found', { status: 404 });
      }
      console.log(`✅ [${requestId}] Organization verified:`, { id: organization.id });
    } catch (orgError) {
      console.error(`❌ [${requestId}] Error checking organization:`, {
        error: orgError instanceof Error ? orgError.message : String(orgError),
        organizationId
      });
      return new NextResponse('Error checking organization', { status: 500 });
    }

    // Handle account based on type
    try {
      if (accountDetails.connection_params.mail) {
        // Validate email account data
        console.log(`📧 [${requestId}] Validating email account data:`, {
          mail: accountDetails.connection_params.mail,
          type: accountDetails.type
        });
        
        // Get email from either username or email field
        const email = accountDetails.connection_params.mail.email || 
                     accountDetails.connection_params.mail.username;
                     
        if (!email) {
          console.error(`❌ [${requestId}] No email found in account details:`, {
            mail: accountDetails.connection_params.mail,
            error: 'Missing email field'
          });
          return new NextResponse('No email found in account details', { status: 400 });
        }

        // Validate email format
        if (!email.includes('@')) {
          console.error(`❌ [${requestId}] Invalid email format:`, {
            email,
            error: 'Invalid email format'
          });
          return new NextResponse('Invalid email format', { status: 400 });
        }

        console.log(`📧 [${requestId}] Email validation passed:`, {
          email,
          organizationId: webhookData.name
        });
        
        try {
          const emailAccount = await saveEmailAccount(email, webhookData.name, webhookData.account_id);
          console.log(`✅ [${requestId}] Email account saved:`, {
            id: emailAccount.id,
            email: emailAccount.email,
            unipileAccountId: emailAccount.unipileAccountId,
            duration: Date.now() - startTime
          });
        } catch (saveError) {
          console.error(`❌ [${requestId}] Failed to save email account:`, {
            error: saveError instanceof Error ? {
              message: saveError.message,
              stack: saveError.stack,
              name: saveError.name
            } : String(saveError),
            email,
            organizationId: webhookData.name,
            duration: Date.now() - startTime
          });
          throw saveError;
        }
      } else if (accountDetails.connection_params.im) {
        // Handle social account
        const username = accountDetails.connection_params.im.username;
        const socialAccount = await saveSocialAccount(
          username,
          organizationId,
          webhookData.account_id,
          accountDetails.type.toLowerCase()
        );
        console.log(`✅ [${requestId}] Social account saved:`, {
          id: socialAccount.id,
          username: socialAccount.username,
          provider: socialAccount.provider
        });
      } else {
        console.log(`⚠️ [${requestId}] Unsupported account type:`, {
          type: accountDetails.type,
          accountId: webhookData.account_id
        });
        return new NextResponse('Unsupported account type', { status: 200 });
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [${requestId}] Webhook processed successfully:`, { duration });
      return new NextResponse('Success', { status: 200 });
    } catch (saveError) {
      if (saveError instanceof Prisma.PrismaClientKnownRequestError) {
        console.error(`❌ [${requestId}] Database error:`, {
          code: saveError.code,
          message: saveError.message,
          meta: saveError.meta
        });
        
        if (saveError.code === 'P2002') {
          return new NextResponse('Duplicate account', { status: 409 });
        }
      }

      console.error(`❌ [${requestId}] Error saving account:`, {
        error: saveError instanceof Error ? {
          message: saveError.message,
          stack: saveError.stack
        } : String(saveError),
        accountDetails
      });
      return new NextResponse('Error saving account', { status: 500 });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [${requestId}] Error processing webhook:`, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : String(error),
      webhookData,
      accountDetails,
      duration
    });
    return new NextResponse('Internal server error', { status: 500 });
  }
} 