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

// Define Unipile account details schema
const UnipileAccountDetails = z.object({
  object: z.literal('Account'),
  id: z.string(),
  name: z.string(),
  identifier: z.string().email(),
  type: z.string(),
  created_at: z.string().datetime()
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
    return UnipileAccountDetails.parse(rawData);
  } catch (error) {
    console.error('Invalid account details format:', {
      error,
      data: rawData
    });
    throw new Error('Invalid account details format from Unipile');
  }
}

export async function POST(request: Request) {
  try {
    console.log('Received Unipile account webhook request', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries())
    });
    
    // Step 1: Parse and validate webhook data
    const rawBody = await request.text();
    console.log('Raw webhook body:', rawBody);
    
    let webhookData: UnipileAccountData;
    try {
      const parsedData = JSON.parse(rawBody);
      webhookData = UnipileAccountWebhook.parse(parsedData);
      console.log('Parsed webhook data:', webhookData);
    } catch (parseError) {
      console.error('Failed to parse webhook data:', {
        error: parseError,
        errorMessage: parseError instanceof Error ? parseError.message : String(parseError),
        rawBody: rawBody.slice(0, 1000)
      });
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
      
      console.log('Email account stored:', {
        id: emailAccount.id,
        unipileAccountId: emailAccount.unipileAccountId,
        name: emailAccount.name,
        email: emailAccount.email
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
        accountDetails
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