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
  received_at: z.string().optional(),
});

type WebhookResponse = {
  success: boolean;
  messageId: string;
  error?: string;
  note?: string;
};

// Support both single object and array of objects
const UniversalInboxPayloadV2 = z.union([
  UniversalInboxWebhookV2,
  z.array(UniversalInboxWebhookV2)
]);

interface UniversalInboxDataV2 {
  message_id: string;
  thread_id: string;
  organizationId: string;
  sender: string;
  content: string;
  message_source: 'EMAIL' | 'LINKEDIN';
  subject?: string;
  recipient_email?: string;
  unipile_email_id?: string;
  email_account_id?: string;
  unipile_linkedin_id?: string;
  social_account_id?: string;
  received_at?: string;
}

// Add this helper function at the top of the file
function parseTimestampWithTimezone(timestamp: string | undefined): string {
  if (!timestamp) {
    // Create a new date in Central Time
    const now = new Date();
    return now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
  }

  try {
    // Parse the ISO timestamp
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    // Return the parsed date in ISO format to preserve timezone
    return date.toISOString();
  } catch (error) {
    console.error('Error parsing timestamp:', error);
    // Fallback to current time in Central Time
    const now = new Date();
    return now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
  }
}

export async function POST(request: Request) {
  try {
    console.log('Received Universal Inbox V2 webhook request');
    
    // Parse and validate webhook data
    const rawBody = await request.text();
    console.log('Raw webhook body:', rawBody);
    
    try {
      const parsedData = JSON.parse(rawBody);
      // Parse the payload which could be an array or single object
      const validatedData = UniversalInboxPayloadV2.parse(parsedData);
      
      // Convert to array if single object
      const dataArray = Array.isArray(validatedData) ? validatedData : [validatedData];
      
      console.log('Processing webhook data:', {
        itemCount: dataArray.length,
        firstItem: {
          message_id: dataArray[0].message_id,
          thread_id: dataArray[0].thread_id,
          organizationId: dataArray[0].organizationId,
          message_source: dataArray[0].message_source
        }
      });

      // Process each item in the array
      const results = await Promise.all(dataArray.map(async (data) => {
        // First verify the organization exists
        const organization = await prisma.organization.findUnique({
          where: { id: data.organizationId }
        });

        if (!organization) {
          console.error('Organization not found:', {
            organizationId: data.organizationId
          });
          return {
            success: false,
            error: 'Organization not found',
            messageId: data.message_id
          } as WebhookResponse;
        }

        // Check if message already exists
        const existingMessage = await prisma.emailMessage.findFirst({
          where: { messageId: data.message_id }
        });

        if (existingMessage) {
          console.log('Message already exists:', {
            messageId: data.message_id,
            threadId: data.thread_id
          });
          return {
            success: true,
            messageId: data.message_id,
            note: 'Message already processed'
          } as WebhookResponse;
        }

        // Handle different message sources
        try {
          if (data.message_source === 'EMAIL') {
            const response = await handleEmailMessage(data);
            return response.json() as Promise<WebhookResponse>;
          } else if (data.message_source === 'LINKEDIN') {
            const response = await handleLinkedInMessage(data);
            return response.json() as Promise<WebhookResponse>;
          } else {
            return {
              success: false,
              error: 'Unsupported message source',
              messageId: data.message_id
            } as WebhookResponse;
          }
        } catch (error) {
          console.error('Error processing message:', {
            messageId: data.message_id,
            error: error instanceof Error ? error.message : String(error)
          });
          return {
            success: false,
            error: 'Failed to process message',
            messageId: data.message_id
          } as WebhookResponse;
        }
      }));

      // If we only received one message, return its result directly
      if (results.length === 1) {
        const result = results[0];
        if (!result.success && result.error) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json(result);
      }

      // If we received multiple messages, return array of results
      return NextResponse.json(results);

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
        receivedAt: data.received_at || new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }),
        messageType: MessageType.REAL_REPLY,
        unipileEmailId: data.unipile_email_id,
        messageSource: 'EMAIL'
      }
    });

    console.log('Successfully stored email message:', {
      messageId: message.messageId,
      threadId: message.threadId,
      organizationId: message.organizationId,
      receivedAt: message.receivedAt
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
  console.log('Processing LinkedIn message:', {
    messageId: data.message_id,
    threadId: data.thread_id,
    sender: data.sender,
    content: data.content?.substring(0, 100) + '...'
  });

  // Validate LinkedIn-specific required fields
  if (!data.message_id || !data.sender || !data.content) {
    console.error('Missing required fields for LinkedIn message:', {
      messageId: data.message_id,
      sender: data.sender,
      hasContent: !!data.content
    });
    return NextResponse.json({
      success: false,
      error: 'Missing required fields for LinkedIn message'
    }, { status: 400 });
  }

  // Find the social account this message belongs to
  const socialAccount = await prisma.socialAccount.findFirst({
    where: {
      organizationId: data.organizationId,
      provider: 'LINKEDIN'
    },
    include: {
      emailAccount: true
    }
  });

  if (!socialAccount) {
    console.error('No LinkedIn account found for organization:', data.organizationId);
    return NextResponse.json({
      success: false,
      error: 'No LinkedIn account found for this organization'
    }, { status: 404 });
  }

  // Store message in database
  try {
    // Check if the message is from us by comparing the sender with our social account name
    const isFromUs = data.sender === socialAccount.name;

    console.log('Message sender check:', {
      sender: data.sender,
      ourAccountName: socialAccount.name,
      isFromUs
    });

    // First check if message already exists - use both messageId and threadId
    const existingMessage = await prisma.emailMessage.findFirst({
      where: { 
        AND: [
          { messageId: data.message_id },
          { threadId: data.thread_id || data.message_id }
        ]
      }
    });

    if (existingMessage) {
      console.log('LinkedIn message already exists:', {
        messageId: data.message_id,
        threadId: data.thread_id,
        existingId: existingMessage.id
      });
      
      // Update the message if needed (e.g., if content or status has changed)
      if (existingMessage.content !== data.content || existingMessage.status !== (isFromUs ? 'NO_ACTION_NEEDED' : 'FOLLOW_UP_NEEDED')) {
        const updatedMessage = await prisma.emailMessage.update({
          where: { id: existingMessage.id },
          data: {
            content: data.content,
            status: isFromUs ? 'NO_ACTION_NEEDED' : 'FOLLOW_UP_NEEDED'
          }
        });
        
        return NextResponse.json({
          success: true,
          messageId: updatedMessage.id,
          note: 'Message updated'
        });
      }
      
      return NextResponse.json({
        success: true,
        messageId: existingMessage.id,
        note: 'Message already processed'
      });
    }

    const message = await prisma.emailMessage.create({
      data: {
        messageId: data.message_id,
        threadId: data.thread_id || data.message_id,
        organizationId: data.organizationId,
        socialAccountId: socialAccount.id,
        emailAccountId: socialAccount.emailAccount?.id || '',
        subject: 'LinkedIn Message',
        sender: data.sender,
        content: data.content,
        recipientEmail: '',
        receivedAt: parseTimestampWithTimezone(data.received_at),
        messageType: MessageType.REAL_REPLY,
        status: isFromUs ? 'NO_ACTION_NEEDED' : 'FOLLOW_UP_NEEDED',
        unipileEmailId: data.unipile_linkedin_id,
        messageSource: 'LINKEDIN'
      }
    });

    console.log('Successfully stored LinkedIn message:', {
      messageId: message.id,
      socialAccountId: socialAccount.id,
      organizationId: data.organizationId,
      isFromUs,
      status: isFromUs ? 'NO_ACTION_NEEDED' : 'FOLLOW_UP_NEEDED',
      receivedAt: message.receivedAt
    });

    return NextResponse.json({
      success: true,
      messageId: message.id
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