import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Received Unipile webhook:', data);

    // Validate webhook data
    if (!data.status || !data.account_id || !data.name) {
      console.error('Invalid webhook data:', data);
      return NextResponse.json(
        { error: 'Invalid webhook data' },
        { status: 400 }
      );
    }

    // Only handle successful account connections
    if (data.status !== 'CREATION_SUCCESS' && data.status !== 'RECONNECTED') {
      console.log('Ignoring non-success webhook:', data);
      return NextResponse.json({ status: 'ignored' });
    }

    // Log organization lookup attempt
    console.log('Looking up organization:', {
      organizationId: data.name,
      webhookData: data
    });

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: data.name },
      select: { id: true }
    });

    // Log organization lookup result
    console.log('Organization lookup result:', {
      found: !!organization,
      organizationId: organization?.id
    });

    if (!organization) {
      console.error('Organization not found:', {
        organizationId: data.name,
        accountId: data.account_id
      });
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get the email account details from Unipile
    const UNIPILE_DSN = process.env.UNIPILE_DSN || 'api4.unipile.com:13465';
    const [subdomain, port] = UNIPILE_DSN.split(':');
    const accountUrl = `https://${subdomain}/api/v1/accounts/${data.account_id}`;
    
    console.log('Fetching account details:', { accountUrl });
    
    const response = await fetch(accountUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': process.env.UNIPILE_API_KEY || '',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch account details:', {
        status: response.status,
        error: errorText,
        url: accountUrl
      });
      return NextResponse.json(
        { error: 'Failed to fetch account details', details: errorText },
        { status: response.status }
      );
    }

    const accountDetails = await response.json();
    console.log('Received account details:', accountDetails);

    // Validate account type
    const supportedTypes = ['MAIL', 'GOOGLE', 'OUTLOOK'];
    if (!supportedTypes.includes(accountDetails.type)) {
      console.error('Unsupported account type:', {
        type: accountDetails.type,
        supported: supportedTypes
      });
      return NextResponse.json(
        { error: 'Unsupported account type', details: `Type must be one of: ${supportedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Extract email and name based on account type
    let email = '';
    let name = accountDetails.name || '';

    if (accountDetails.type === 'MAIL') {
      // For IMAP/SMTP accounts
      email = accountDetails.connection_params?.mail?.email || 
              accountDetails.connection_params?.email || '';
    } else if (accountDetails.type === 'GOOGLE') {
      // For Google accounts
      email = accountDetails.connection_params?.gmail?.email ||
              accountDetails.connection_params?.email || '';
    } else if (accountDetails.type === 'OUTLOOK') {
      // For Outlook accounts
      email = accountDetails.connection_params?.outlook?.email ||
              accountDetails.connection_params?.email || '';
    }

    if (!email) {
      console.error('No email found in account details:', {
        type: accountDetails.type,
        connection_params: accountDetails.connection_params
      });
      return NextResponse.json(
        { error: 'No email found in account details' },
        { status: 400 }
      );
    }
    
    // Create or update the email account in our database
    const emailAccount = await prisma.emailAccount.upsert({
      where: {
        unipileAccountId: data.account_id,
      },
      create: {
        email,
        name: name || email,
        unipileAccountId: data.account_id,
        organizationId: organization.id,
        isActive: true,
      },
      update: {
        email,
        name: name || email,
        organizationId: organization.id,
        isActive: true,
      },
    });

    console.log('Successfully processed account connection:', {
      email: emailAccount.email,
      name: emailAccount.name,
      unipileAccountId: emailAccount.unipileAccountId,
      organizationId: organization.id,
      type: accountDetails.type
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 