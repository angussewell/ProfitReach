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
  try {
    const body = await req.json();
    const organizationId = headers().get('x-organization-id');

    if (!organizationId) {
      return new NextResponse('Missing organization ID', { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    // Create webhook log
    const webhookLog = await prisma.webhookLog.create({
      data: {
        accountId: body.accountId || 'unknown',
        organizationId,
        status: 'success',
        scenarioName: body.scenarioName || 'Unknown',
        contactEmail: body.contactEmail || 'Unknown',
        contactName: body.contactName || 'Unknown',
        company: body.company || 'Unknown',
        requestBody: body,
      },
    });

    // If the scenario was successful and the organization is on the at_cost plan,
    // deduct a credit and report usage
    if (
      webhookLog.status === 'success' &&
      organization.billingPlan === 'at_cost'
    ) {
      try {
        await prisma.$transaction(async (tx) => {
          await updateCreditBalance(organizationId, -1, 'Scenario run', webhookLog.id);
          await reportScenarioUsage(organizationId);
        });
      } catch (error) {
        // If there are insufficient credits or no active subscription,
        // update the webhook log status
        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: { status: 'blocked' },
        });

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error processing scenario:', {
          error: errorMessage,
          organizationId,
          webhookLogId: webhookLog.id,
        });

        return new NextResponse(
          'Insufficient credits or no active subscription',
          { status: 402 }
        );
      }
    }

    return new NextResponse('Webhook processed', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
} 