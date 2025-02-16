import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Force dynamic API route
export const dynamic = 'force-dynamic';

const UNIPILE_DSN = process.env.UNIPILE_DSN || 'api4.unipile.com:13465';
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;

// Production URL configuration
const PRODUCTION_URL = 'https://app.messagelm.com';
const APP_URL = process.env.NODE_ENV === 'production' ? PRODUCTION_URL : process.env.NEXT_PUBLIC_APP_URL;

// Log environment info on module load
console.log('🌍 Unipile webhook handler configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  APP_URL,
  UNIPILE_DSN,
  hasApiKey: !!UNIPILE_API_KEY,
  webhookUrl: `${APP_URL}/api/webhooks/unipile`,
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
  if (!UNIPILE_API_KEY) {
    throw new Error('Missing UNIPILE_API_KEY');
  }

  console.log('🔍 Fetching Unipile account details:', { accountId });

  const response = await fetch(`https://${UNIPILE_DSN}/api/v1/accounts/${accountId}`, {
    headers: {
      'Accept': 'application/json',
      'X-API-KEY': UNIPILE_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to fetch account details:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`Failed to fetch account details: ${response.statusText}`);
  }

  const rawData = await response.json();
  console.log('📦 Raw Unipile account details:', rawData);

  try {
    const accountDetails = UnipileAccountDetails.parse(rawData);
    console.log('✅ Validated account details:', {
      id: accountDetails.id,
      type: accountDetails.type,
      hasMailParams: !!accountDetails.connection_params.mail,
      hasImParams: !!accountDetails.connection_params.im
    });
    return accountDetails;
  } catch (error) {
    console.error('❌ Invalid account details format:', {
      error,
      data: rawData
    });
    throw new Error('Invalid account details format from Unipile');
  }
}

// Function to save email account
async function saveEmailAccount(email: string, organizationId: string, unipileAccountId: string) {
  console.log('📧 Saving email account:', { email, organizationId, unipileAccountId });
  
  try {
    // First check if account exists
    const existing = await prisma.emailAccount.findUnique({
      where: { unipileAccountId }
    });
    console.log('📧 Existing account check:', { 
      exists: !!existing,
      id: existing?.id,
      email: existing?.email 
    });

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
    
    console.log('📧 Email account saved successfully:', {
      id: result.id,
      email: result.email,
      unipileAccountId: result.unipileAccountId,
      organizationId: result.organizationId,
      isActive: result.isActive,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    });
    
    return result;
  } catch (error) {
    console.error('📧 Error saving email account:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
      email,
      organizationId,
      unipileAccountId
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
  
  // Log raw request immediately
  console.log(`🔔 [${requestId}] Unipile webhook received:`, {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    timestamp: new Date().toISOString()
  });

  let webhookData;
  let accountDetails;
  let rawBody;
  
  try {
    // Read and log raw body
    rawBody = await req.text();
    console.log(`📝 [${requestId}] Raw webhook body:`, rawBody);

    try {
      const body = JSON.parse(rawBody);
      console.log(`✅ [${requestId}] Parsed webhook body:`, body);

      // Validate webhook data
      console.log(`🔍 [${requestId}] Validating webhook data...`);
      const validationResult = UnipileAccountWebhook.safeParse(body);
      
      if (!validationResult.success) {
        console.error(`❌ [${requestId}] Invalid webhook data:`, {
          error: validationResult.error,
          body
        });
        return new NextResponse('Invalid webhook data', { status: 400 });
      }

      webhookData = validationResult.data;
      console.log(`✅ [${requestId}] Validated webhook data:`, webhookData);
    } catch (parseError) {
      console.error(`❌ [${requestId}] Failed to parse webhook body:`, {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        rawBody
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
        // Handle email account
        console.log(`📧 [${requestId}] Processing email account:`, accountDetails.connection_params.mail);
        
        // Get email from either username or email field
        const email = accountDetails.connection_params.mail.email || 
                     accountDetails.connection_params.mail.username;
                     
        if (!email) {
          console.error(`❌ [${requestId}] No email found in account details:`, accountDetails.connection_params.mail);
          return new NextResponse('No email found in account details', { status: 400 });
        }

        console.log(`📧 [${requestId}] Found email:`, email);
        
        const emailAccount = await saveEmailAccount(email, organizationId, webhookData.account_id);
        console.log(`✅ [${requestId}] Email account saved:`, {
          id: emailAccount.id,
          email: emailAccount.email,
          unipileAccountId: emailAccount.unipileAccountId
        });
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