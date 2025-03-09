import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { MessageType } from '@prisma/client';

// Define webhook data schema - supporting both email and LinkedIn messages
const UniversalInboxWebhookV2 = z.object({
  // Common required fields
  message_id: z.string(),
  thread_id: z.string(),
  organizationId: z.string(),
  sender: z.string(),
  content: z.string(),
  
  // Source type - determines which other fields are required
  message_source: z.enum(['EMAIL', 'LINKEDIN']).default('EMAIL'),
  
  // Email-specific fields - required if message_source is EMAIL
  unipile_email_id: z.string().optional(),
  email_account_id: z.string().optional(),
  subject: z.string().optional().default(""),
  recipient_email: z.string().optional().default(""),
  
  // LinkedIn-specific fields - required if message_source is LINKEDIN
  unipile_linkedin_id: z.string().optional(),
  social_account_id: z.string().optional(),
});

type UniversalInboxDataV2 = z.infer<typeof UniversalInboxWebhookV2>;

export async function POST(request: Request) {
  try {
    console.log('Received Universal Inbox V2 webhook request');
    
    // Parse and validate webhook data
    let data: UniversalInboxDataV2;
    const rawBody = await request.text();
    
    console.log('Raw webhook body:', rawBody);
    
    try {
      const parsedData = JSON.parse(rawBody);
      data = UniversalInboxWebhookV2.parse(parsedData);
      console.log('Parsed webhook data:', {
        message_id: data.message_id,
        thread_id: data.thread_id,
        organizationId: data.organizationId,
        message_source: data.message_source,
        account_id: data.message_source === 'EMAIL' ? data.email_account_id : data.social_account_id
      });

    } catch (parseError) {
      console.error('Failed to parse webhook data:', {
        error: parseError,
        errorMessage: parseError instanceof Error ? parseError.message : String(parseError),
        rawBody: rawBody.slice(0, 1000) // Log first 1000 chars only
      });
      return NextResponse.json(
        { 
          error: 'Invalid JSON data', 
          details: parseError instanceof Error ? parseError.message : String(parseError),
          help: 'Please ensure the request body is valid JSON and contains the required fields'
        },
        { status: 400 }
      );
    }

    // First verify the organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: data.organizationId }
    });

    if (!organization) {
      console.error('Organization not found:', {
        organizationId: data.organizationId
      });
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Handle different message sources
    if (data.message_source === 'EMAIL') {
      return await handleEmailMessage(data);
    } else if (data.message_source === 'LINKEDIN') {
      return await handleLinkedInMessage(data);
    } else {
      return NextResponse.json(
        { error: 'Unsupported message source' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    // Log the full error details
    console.error('Webhook error:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      type: typeof error
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : String(error),
        help: 'Please check the request format and try again'
      },
      { status: 500 }
    );
  }
}

// Handle Email Messages
async function handleEmailMessage(data: UniversalInboxDataV2) {
  // Validate email-specific required fields
  if (!data.email_account_id) {
    return NextResponse.json(
      { error: 'Missing email_account_id for email message' },
      { status: 400 }
    );
  }

  // Look up email account by Unipile account ID
  const emailAccount = await prisma.emailAccount.findFirst({
    where: {
      unipileAccountId: data.email_account_id,
      organizationId: data.organizationId
    }
  });

  console.log('Email account lookup result:', {
    found: !!emailAccount,
    unipileAccountId: data.email_account_id,
    organizationId: data.organizationId
  });

  if (!emailAccount) {
    // Check if account exists but belongs to different organization
    const accountExists = await prisma.emailAccount.findFirst({
      where: { unipileAccountId: data.email_account_id }
    });

    if (accountExists) {
      console.error('Email account belongs to different organization:', {
        unipileAccountId: data.email_account_id,
        requestedOrg: data.organizationId,
        actualOrg: accountExists.organizationId
      });
      return NextResponse.json(
        { error: 'Email account belongs to a different organization' },
        { status: 403 }
      );
    }

    console.error('Email account not found:', {
      unipileAccountId: data.email_account_id
    });
    return NextResponse.json(
      { error: 'Email account not found' },
      { status: 404 }
    );
  }

  // Store message in database
  try {
    const message = await prisma.emailMessage.create({
      data: {
        messageId: data.message_id,
        threadId: data.thread_id,
        organizationId: data.organizationId,
        emailAccountId: emailAccount.id,
        subject: data.subject || '',
        sender: data.sender,
        recipientEmail: data.recipient_email || '',
        content: data.content,
        receivedAt: new Date(),
        messageType: MessageType.REAL_REPLY,
        unipileEmailId: data.unipile_email_id,
        messageSource: 'EMAIL'
      }
    });

    console.log('Successfully stored email message:', {
      messageId: message.messageId,
      threadId: message.threadId,
      organizationId: message.organizationId
    });

    return NextResponse.json({
      success: true,
      messageId: message.messageId,
      threadId: message.threadId
    });

  } catch (error) {
    // Handle database errors
    return handleDatabaseError(error, data);
  }
}

/**
 * Get or create a special LinkedIn integration email account for the organization
 */
async function getOrCreateLinkedInEmailAccount(organizationId: string) {
  // First, look for an existing LinkedIn integration account
  const linkedInAccount = await prisma.emailAccount.findFirst({
    where: {
      organizationId: organizationId,
      name: 'LinkedIn Integration',
      isActive: true
    }
  });

  // If an account exists, return it
  if (linkedInAccount) {
    console.log('Found existing LinkedIn integration account:', {
      id: linkedInAccount.id,
      organizationId: organizationId
    });
    return linkedInAccount;
  }

  // Otherwise, create a new account
  const emailDomain = process.env.NEXT_PUBLIC_APP_URL?.replace(/https?:\/\//, '') || 'messagelm.com';
  const newAccount = await prisma.emailAccount.create({
    data: {
      email: `linkedin-integration-${organizationId}@${emailDomain}`,
      name: 'LinkedIn Integration',
      organizationId: organizationId,
      isActive: true
    }
  });

  console.log('Created new LinkedIn integration account:', {
    id: newAccount.id,
    email: newAccount.email,
    organizationId: organizationId
  });

  return newAccount;
}

// Handle LinkedIn Messages
async function handleLinkedInMessage(data: UniversalInboxDataV2) {
  // Validate LinkedIn-specific required fields
  if (!data.social_account_id) {
    return NextResponse.json(
      { error: 'Missing social_account_id for LinkedIn message' },
      { status: 400 }
    );
  }

  // Look up social account by Unipile account ID
  const socialAccount = await prisma.socialAccount.findFirst({
    where: {
      unipileAccountId: data.social_account_id,
      organizationId: data.organizationId,
      provider: 'LINKEDIN'
    }
  });

  console.log('LinkedIn account lookup result:', {
    found: !!socialAccount,
    unipileAccountId: data.social_account_id,
    organizationId: data.organizationId
  });

  if (!socialAccount) {
    // Check if account exists but belongs to different organization
    const accountExists = await prisma.socialAccount.findFirst({
      where: { unipileAccountId: data.social_account_id }
    });

    if (accountExists) {
      console.error('LinkedIn account belongs to different organization:', {
        unipileAccountId: data.social_account_id,
        requestedOrg: data.organizationId,
        actualOrg: accountExists.organizationId
      });
      return NextResponse.json(
        { error: 'LinkedIn account belongs to a different organization' },
        { status: 403 }
      );
    }

    console.error('LinkedIn account not found:', {
      unipileAccountId: data.social_account_id
    });
    return NextResponse.json(
      { error: 'LinkedIn account not found' },
      { status: 404 }
    );
  }

  // Try to get an associated email account for this organization
  let emailAccount;
  
  // First, check if this social account has an associated email account
  if (socialAccount.emailAccountId) {
    emailAccount = await prisma.emailAccount.findUnique({
      where: {
        id: socialAccount.emailAccountId,
        organizationId: data.organizationId
      }
    });
  }
  
  // If no associated account, get or create a LinkedIn integration account
  if (!emailAccount) {
    console.log('No associated email account found for LinkedIn account, using integration account');
    try {
      emailAccount = await getOrCreateLinkedInEmailAccount(data.organizationId);
    } catch (error) {
      console.error('Failed to create LinkedIn integration account:', error);
      return NextResponse.json(
        { error: 'Failed to create LinkedIn integration account' },
        { status: 500 }
      );
    }
  }

  // Store message in database
  try {
    const message = await prisma.emailMessage.create({
      data: {
        messageId: data.message_id,
        threadId: data.thread_id,
        organizationId: data.organizationId,
        emailAccountId: emailAccount.id,
        subject: 'LinkedIn Message', // Default subject for LinkedIn messages
        sender: data.sender,
        recipientEmail: '', // Empty for LinkedIn messages
        content: data.content,
        receivedAt: new Date(),
        messageType: MessageType.REAL_REPLY,
        socialAccountId: socialAccount.id,
        unipileEmailId: data.unipile_linkedin_id, // Store LinkedIn ID here for now
        messageSource: 'LINKEDIN'
      }
    });

    console.log('Successfully stored LinkedIn message:', {
      messageId: message.messageId,
      threadId: message.threadId,
      organizationId: message.organizationId
    });

    return NextResponse.json({
      success: true,
      messageId: message.messageId,
      threadId: message.threadId
    });

  } catch (error) {
    // Handle database errors
    return handleDatabaseError(error, data);
  }
}

// Common error handling for database operations
function handleDatabaseError(error: any, data: UniversalInboxDataV2) {
  // Check for unique constraint violation
  if (error instanceof Error && error.name === 'PrismaClientKnownRequestError' && (error as any).code === 'P2002') {
    console.log('Duplicate message received:', {
      messageId: data.message_id,
      error: error.message
    });
    return NextResponse.json({
      success: true,
      messageId: data.message_id,
      note: 'Message already processed'
    });
  }
  
  // Log other errors
  console.error('Failed to store message:', {
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error,
    type: typeof error
  });
  
  return NextResponse.json(
    { 
      error: 'Failed to process webhook',
      details: error instanceof Error ? error.message : String(error),
      help: 'Please check the request format and try again'
    },
    { status: 500 }
  );
} 