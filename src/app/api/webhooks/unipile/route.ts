import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic API route
export const dynamic = 'force-dynamic';

const UNIPILE_DSN = process.env.UNIPILE_DSN || 'api4.unipile.com:13465';
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;

// Define webhook data schema
const UnipileAccountWebhook = z.object({
  status: z.enum(['CREATION_SUCCESS', 'RECONNECTED']),
  account_id: z.string(),
  name: z.string()
});

// Define Unipile account details schema based on their API response
const UnipileAccountDetails = z.object({
  object: z.literal('Account'),
  id: z.string(),
  name: z.string(),
  type: z.string(),
  created_at: z.string(),
  identifier: z.string().email().optional(), // Some account types might not have email
  connection_params: z.object({}).passthrough(), // Allow any connection params
  last_fetched_at: z.string().optional(),
  current_signature: z.string().optional(),
  signatures: z.array(
    z.object({
      title: z.string(),
      content: z.string()
    })
  ).optional(),
  groups: z.array(z.string()).optional(),
  sources: z.array(
    z.object({
      id: z.string(),
      status: z.string()
    })
  ).optional()
});

type UnipileAccountData = z.infer<typeof UnipileAccountWebhook>;
type UnipileAccountDetailsData = z.infer<typeof UnipileAccountDetails>;

// Function to fetch and validate account details from Unipile
async function getUnipileAccountDetails(accountId: string): Promise<UnipileAccountDetailsData> {
  if (!UNIPILE_API_KEY) {
    throw new Error('Missing UNIPILE_API_KEY');
  }

  console.log('Fetching Unipile account details:', { accountId });

  const response = await fetch(`https://${UNIPILE_DSN}/api/v1/accounts/${accountId}`, {
    headers: {
      'Accept': 'application/json',
      'X-API-KEY': UNIPILE_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch account details:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`Failed to fetch account details: ${response.statusText}`);
  }

  const rawData = await response.json();
  console.log('Raw Unipile account details:', rawData);

  try {
    const accountDetails = UnipileAccountDetails.parse(rawData);
    
    // For email accounts, ensure we have an identifier
    if (!accountDetails.identifier && accountDetails.type === 'GOOGLE') {
      throw new Error('Missing email identifier for Google account');
    }
    
    return accountDetails;
  } catch (error) {
    console.error('Invalid account details format:', {
      error,
      data: rawData
    });
    throw new Error('Invalid account details format from Unipile');
  }
}

export async function POST(request: Request) {
  console.log('Received Unipile webhook request:', {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries())
  });

  try {
    // Log raw request body for debugging
    const rawBody = await request.text();
    console.log('Raw webhook body:', rawBody);

    // Parse the body as JSON
    let body;
    try {
      body = JSON.parse(rawBody);
      console.log('Parsed webhook body:', body);
    } catch (parseError) {
      console.error('Failed to parse webhook body:', parseError);
      return NextResponse.json(
        { 
          error: 'Invalid JSON',
          details: parseError instanceof Error ? parseError.message : String(parseError)
        },
        { status: 400 }
      );
    }

    // Step 1: Validate webhook data
    let webhookData: UnipileAccountData;
    try {
      webhookData = UnipileAccountWebhook.parse(body);
      console.log('Validated webhook data:', webhookData);
    } catch (parseError) {
      console.error('Invalid webhook data:', parseError);
      return NextResponse.json(
        { 
          error: 'Invalid webhook data', 
          details: parseError instanceof Error ? parseError.message : String(parseError)
        },
        { status: 400 }
      );
    }

    // Step 2: Fetch and validate account details
    let accountDetails: UnipileAccountDetailsData;
    try {
      accountDetails = await getUnipileAccountDetails(webhookData.account_id);
      console.log('Validated account details:', accountDetails);
    } catch (error) {
      console.error('Failed to get account details:', error);
      return NextResponse.json(
        { 
          error: 'Failed to get account details',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }

    // Step 3: Save to database only after we have valid data
    try {
      // Ensure we have an email identifier
      if (!accountDetails.identifier) {
        throw new Error('Missing email identifier in account details');
      }

      console.log('Attempting to save account:', {
        unipileAccountId: accountDetails.id,
        name: accountDetails.name,
        email: accountDetails.identifier,
        organizationId: webhookData.name
      });

      const emailAccount = await prisma.emailAccount.upsert({
        where: {
          unipileAccountId: accountDetails.id
        },
        update: {
          isActive: true,
          name: accountDetails.name,
          email: accountDetails.identifier
        },
        create: {
          unipileAccountId: accountDetails.id,
          organizationId: webhookData.name,
          isActive: true,
          name: accountDetails.name,
          email: accountDetails.identifier
        }
      });
      
      console.log('Email account stored successfully:', {
        id: emailAccount.id,
        unipileAccountId: emailAccount.unipileAccountId,
        name: emailAccount.name,
        email: emailAccount.email,
        organizationId: emailAccount.organizationId
      });
      
      return NextResponse.json({
        success: true,
        accountId: emailAccount.id
      });
    } catch (error) {
      console.error('Failed to store account:', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        accountDetails: {
          id: accountDetails.id,
          name: accountDetails.name,
          email: accountDetails.identifier
        }
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to store account',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Webhook handler error:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 