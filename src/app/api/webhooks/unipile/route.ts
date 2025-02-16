import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { updateCreditBalance, reportScenarioUsage } from '@/lib/stripe';
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
    }).optional(),
    im: z.object({
      id: z.string(),
      username: z.string(),
      premiumId: z.string().nullable(),
      premiumFeatures: z.array(z.string()),
      premiumContractId: z.string().nullable(),
      organizations: z.array(
        z.object({
          name: z.string(),
          messaging_enabled: z.boolean(),
          mailbox_urn: z.string(),
          organization_urn: z.string()
        })
      ).optional()
    }).optional()
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

export async function POST(req: Request) {
  const startTime = Date.now();
  let webhookData;
  let accountDetails;
  
  try {
    const body = await req.json();
    console.log('Received Unipile webhook:', {
      body,
      headers: Object.fromEntries(req.headers.entries()),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Validate webhook data
    const validationResult = UnipileAccountWebhook.safeParse(body);
    if (!validationResult.success) {
      console.error('Invalid webhook data:', {
        error: validationResult.error,
        body,
        timestamp: new Date().toISOString()
      });
      return new NextResponse('Invalid webhook data', { status: 400 });
    }

    webhookData = validationResult.data;
    console.log('Validated webhook data:', webhookData);

    // Get account details from Unipile
    accountDetails = await getUnipileAccountDetails(webhookData.account_id);
    console.log('Account details:', accountDetails);

    // Only process email accounts
    if (!accountDetails.connection_params.mail) {
      console.log('Not an email account, skipping:', {
        accountId: webhookData.account_id,
        type: accountDetails.type,
        timestamp: new Date().toISOString()
      });
      return new NextResponse('Not an email account', { status: 200 });
    }

    const email = accountDetails.connection_params.mail.username;
    const organizationId = webhookData.name; // We pass the organizationId in the name field

    console.log('Creating/updating email account:', {
      email,
      organizationId,
      unipileAccountId: webhookData.account_id,
      timestamp: new Date().toISOString()
    });

    // Create or update the email account
    const emailAccount = await prisma.emailAccount.upsert({
      where: {
        unipileAccountId: webhookData.account_id
      },
      create: {
        email,
        name: email, // Use email as initial name
        organizationId,
        unipileAccountId: webhookData.account_id,
        isActive: true,
        updatedAt: new Date(),
        outgoingServer: '',
        outgoingServerPort: 0,
        password: ''
      },
      update: {
        email,
        updatedAt: new Date()
      }
    });

    const duration = Date.now() - startTime;
    console.log('Email account created/updated successfully:', {
      id: emailAccount.id,
      email: emailAccount.email,
      organizationId: emailAccount.organizationId,
      duration,
      timestamp: new Date().toISOString()
    });

    return new NextResponse('Success', { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Error processing Unipile webhook:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
      webhookData,
      accountDetails,
      duration,
      timestamp: new Date().toISOString()
    });
    return new NextResponse(
      'Internal server error',
      { status: 500 }
    );
  }
} 