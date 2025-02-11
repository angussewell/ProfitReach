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
  connection_params: z.object({
    mail: z.object({
      id: z.string(),
      username: z.string()
    })
  }),
  sources: z.array(
    z.object({
      id: z.string(),
      status: z.string()
    })
  ),
  groups: z.array(z.string()).default([])
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
  // Log full request details
  console.log('Received Unipile webhook request:', {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString()
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
      console.error('Failed to parse webhook body:', {
        error: parseError,
        rawBody,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        { 
          error: 'Invalid JSON',
          details: parseError instanceof Error ? parseError.message : String(parseError)
        },
        { status: 400 }
      );
    }

    // Validate webhook payload
    if (!body.status || !body.account_id || !body.name) {
      console.error('Invalid webhook payload:', body);
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get organization ID from the name field
    const organizationId = body.name;

    // Fetch account details from Unipile
    const accountDetails = await getUnipileAccountDetails(body.account_id);
    if (!accountDetails) {
      console.error('Failed to fetch account details from Unipile');
      return NextResponse.json(
        { error: 'Failed to fetch account details' },
        { status: 500 }
      );
    }

    // Extract email from account details
    const email = accountDetails.connection_params?.mail?.username;
    if (!email) {
      console.error('No email found in account details:', accountDetails);
      return NextResponse.json(
        { error: 'No email found in account details' },
        { status: 400 }
      );
    }

    // Check if account already exists
    const existingAccount = await prisma.emailAccount.findUnique({
      where: {
        unipileAccountId: body.account_id
      }
    });

    if (existingAccount) {
      // Update existing account
      const updatedAccount = await prisma.emailAccount.update({
        where: {
          unipileAccountId: body.account_id
        },
        data: {
          email,
          isActive: true,
          updatedAt: new Date()
        }
      });
      console.log('Updated existing email account:', updatedAccount);
      return NextResponse.json(updatedAccount);
    }

    // Create new account
    const newAccount = await prisma.emailAccount.create({
      data: {
        email,
        name: email, // Initially set name to email, will be updated by user
        organizationId,
        unipileAccountId: body.account_id,
        isActive: true
      }
    });

    console.log('Created new email account:', newAccount);
    return NextResponse.json(newAccount);

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 