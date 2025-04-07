import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { PrismaClient, Prisma } from '@prisma/client'; // Import Prisma for raw query types

// Schema for reply request validation
const replyRequestSchema = z.object({
  messageId: z.string(),
  content: z.string(),
  subject: z.string().optional(),
  action: z.enum(['reply', 'replyall', 'forward']).default('reply'),
  toAddress: z.string().optional(),
  ccAddress: z.string().optional(),
  bccAddress: z.string().optional(),
  fromEmail: z.string().optional(),
  socialAccountId: z.string().optional(),
});

// Webhook URLs
const EMAIL_WEBHOOK_URLS = [
  'https://n8n.srv768302.hstgr.cloud/webhook-test/sending-replies',
  'https://n8n.srv768302.hstgr.cloud/webhook/sending-replies'
];

// LinkedIn webhook URL - Update to the correct URL
const LINKEDIN_WEBHOOK_URL = 'https://n8n.srv768302.hstgr.cloud/webhook/linkedin-replies';

// Add more detailed logging to help diagnose issues
function logDebug(message: string, data: any) {
  console.log(`[DEBUG] ${message}:`, 
    typeof data === 'object' 
      ? JSON.stringify(data, null, 2).substring(0, 1000) 
      : data
  );
}

// Define types for the success and error result to fix TypeScript issues
type WebhookSuccessResult = {
  url: string;
  success: true;
  status: number;
  data: any;
};

type WebhookErrorResult = {
  url: string;
  success: false;
  error: string;
};

type WebhookResult = WebhookSuccessResult | WebhookErrorResult;

// Create a shared lib file for timestamp and message ID functions
// For now, duplicate them here for consistency

// Generate a reliable timestamp-based message ID for our database
function generateMessageId(): string {
  // Use Date.now() as the first part to ensure chronological order
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${randomPart}`;
}

// Function to get current time in a consistent format
function getStandardizedTimestamp(inputTimestamp?: string | Date): Date {
  if (!inputTimestamp) {
    return new Date();
  }
  return new Date(inputTimestamp);
}

// Keep the existing getCurrentCentralTime function but make it use our standardized function
function getCurrentCentralTime(): Date {
  return getStandardizedTimestamp();
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized or user email missing from session' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate using zod schema
    const validationResult = replyRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.error('Validation error:', errorMessage);
      return NextResponse.json(
        { error: 'Invalid request data', details: errorMessage },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    
    // Generate a new message ID early to use consistently throughout
    const newMessageId = generateMessageId();
    
    logDebug('Validated reply request', {
      messageId: validatedData.messageId,
      newMessageId: newMessageId,
      action: validatedData.action,
      hasSocialAccountId: !!validatedData.socialAccountId
    });

    // Get the original message using raw SQL
    const originalMessages: any[] = await prisma.$queryRaw(
      Prisma.sql`SELECT * FROM "EmailMessage" 
                 WHERE "messageId" = ${validatedData.messageId} 
                 AND "organizationId" = ${session.user.organizationId} 
                 LIMIT 1`
    );
    const originalMessage = originalMessages.length > 0 ? originalMessages[0] : null;

    if (!originalMessage) {
      console.error('Original message not found:', validatedData.messageId);
      return NextResponse.json(
        { error: 'Original message not found' },
        { status: 404 }
      );
    }
    // --- ADDED: Explicit check for originalMessage ---
    if (!originalMessage) {
      console.error('CRITICAL: originalMessage became null after initial check', { messageId: validatedData.messageId });
      return NextResponse.json({ error: 'Internal server error: Failed to retrieve original message consistently' }, { status: 500 });
    }
    // --- END ADDED ---

    // Check if this is a LinkedIn message
    const isLinkedInMessage = originalMessage.messageSource === 'LINKEDIN';
    logDebug('Message source identified', {
      isLinkedInMessage, 
      messageSource: originalMessage.messageSource,
      hasSocialAccountId: isLinkedInMessage && !!originalMessage.socialAccountId,
      providedSocialAccountId: validatedData.socialAccountId || 'none'
    });

    // For LinkedIn messages, we need the social account
    let socialAccount = null;
    if (isLinkedInMessage) {
      // Prefer the provided socialAccountId (from the frontend) over the one in the original message
      const socialAccountId = validatedData.socialAccountId || originalMessage.socialAccountId;
      
      if (!socialAccountId) {
        console.error('No socialAccountId provided for LinkedIn message');
        return NextResponse.json(
          { error: 'Social account ID is required for LinkedIn messages' },
          { status: 400 }
        );
      }

      // Look up the social account
      socialAccount = await prisma.socialAccount.findFirst({
        where: {
          id: socialAccountId,
          organizationId: session.user.organizationId,
        },
      });

      if (!socialAccount) {
        console.error('Social account not found:', {
          socialAccountId,
          organizationId: session.user.organizationId
        });
        return NextResponse.json(
          { error: 'Social account not found' },
          { status: 404 }
        );
      }
      
      logDebug('Found social account for LinkedIn message', {
        socialAccountId: socialAccount.id,
        socialAccountName: socialAccount.name,
        provider: socialAccount.provider
      });
    }

    // Get the email account to send from (either specified or original recipient)
    // This is still needed even for LinkedIn messages (for storing in our database)
    const fromEmail = validatedData.fromEmail || originalMessage.recipientEmail;
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        organizationId: session.user.organizationId,
        email: fromEmail,
      },
      select: {
        id: true,
        email: true,
        name: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        unipileAccountId: true
      }
    });

    if (!emailAccount) {
      console.error('Email account not found:', {
        fromEmail,
        organizationId: session.user.organizationId
      });
      return NextResponse.json(
        { error: 'Selected email account not found' },
        { status: 404 }
      );
    }

    try {
      // Prepare base webhook payload with common fields
      const basePayload = {
        internalEmailId: originalMessage.id,
        messageId: originalMessage.messageId,
        threadId: originalMessage.threadId,
        organizationId: session.user.organizationId,
        subject: originalMessage.subject || 'No Subject',
        content: formatEmailContent(validatedData.content, originalMessage),
        plainContent: validatedData.content,
        to: validatedData.toAddress || originalMessage.sender,
        cc: validatedData.ccAddress,
        bcc: validatedData.bccAddress,
        originalMessage: {
          id: originalMessage.id,
          messageId: originalMessage.messageId,
          threadId: originalMessage.threadId,
          subject: originalMessage.subject,
          sender: originalMessage.sender,
          recipientEmail: originalMessage.recipientEmail,
          content: originalMessage.content,
          receivedAt: originalMessage.receivedAt,
          messageType: originalMessage.messageType,
          isRead: originalMessage.isRead,
          classificationScores: originalMessage.classificationScores,
          unipileEmailId: originalMessage.unipileEmailId,
          organizationId: originalMessage.organizationId,
          emailAccountId: originalMessage.emailAccountId,
          messageSource: originalMessage.messageSource,
          socialAccountId: originalMessage.socialAccountId
        },
        timestamp: new Date().toISOString(),
        replyType: validatedData.action,
        isHtml: true
      };

      // Prepare source-specific payload
      let webhookPayload;
      let webhookUrls;
      
      if (isLinkedInMessage && socialAccount) {
        // LinkedIn-specific payload with detailed information
        webhookPayload = {
          ...basePayload,
          repliedByEmail: session.user.email,
          messageSource: 'LINKEDIN',
          socialAccountId: socialAccount.id,
          unipileAccountId: socialAccount.unipileAccountId,
          linkedInUsername: socialAccount.username,
          fromName: socialAccount.name,
          provider: socialAccount.provider,
          isActive: socialAccount.isActive,
          internalAccountId: emailAccount.id,
          fromEmail: emailAccount.email,
          newMessageId: newMessageId,
          status: 'WAITING_FOR_REPLY',
          isRead: true
        };
        
        webhookUrls = [LINKEDIN_WEBHOOK_URL];
        
        logDebug('Sending LinkedIn reply to webhook with newMessageId', {
          webhook: LINKEDIN_WEBHOOK_URL,
          repliedByEmail: session.user.email,
          messageId: originalMessage.messageId,
          newMessageId: newMessageId,
          socialAccountId: socialAccount.id,
          socialAccountName: socialAccount.name,
          status: 'WAITING_FOR_REPLY'
        });
      } else {
        // Email-specific payload
        webhookPayload = {
          ...basePayload,
          repliedByEmail: session.user.email,
          messageSource: 'EMAIL',
          unipileEmailId: originalMessage.unipileEmailId,
          internalAccountId: emailAccount.id,
          unipileAccountId: emailAccount.unipileAccountId,
          fromEmail: emailAccount.email,
          fromName: emailAccount.name,
          newMessageId: newMessageId,
          status: 'WAITING_FOR_REPLY',
          isRead: true
        };
        
        webhookUrls = EMAIL_WEBHOOK_URLS;
        
        logDebug('Sending email reply to webhooks with newMessageId', {
          webhooks: EMAIL_WEBHOOK_URLS,
          repliedByEmail: session.user.email,
          messageId: originalMessage.messageId,
          newMessageId: newMessageId,
          status: 'WAITING_FOR_REPLY'
        });
      }

      logDebug('Webhook payload', {
        messageSource: webhookPayload.messageSource,
        repliedByEmail: webhookPayload.repliedByEmail,
        socialAccountId: isLinkedInMessage && 'socialAccountId' in webhookPayload ? webhookPayload.socialAccountId : null,
        messageId: webhookPayload.messageId,
        threadId: webhookPayload.threadId,
        // Truncate content for logs
        plainContent: webhookPayload.plainContent?.substring(0, 100) + '...'
      });

      // Send to webhook(s) and collect results with better error handling
      const webhookResults = await Promise.allSettled(webhookUrls.map(async (url) => {
        try {
          logDebug(`Sending to webhook ${url}`, { 
            method: 'POST',
            payloadSize: JSON.stringify(webhookPayload).length
          });
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload),
          });

          // Try to parse response as JSON, fall back to text if not JSON
          let responseData;
          const responseText = await response.text();
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = { text: responseText };
          }

          const result: WebhookSuccessResult = {
            url,
            success: true,
            status: response.status,
            data: responseData
          };
          
          logDebug(`Webhook response for ${url}`, {
            status: response.status,
            success: response.ok,
            dataType: typeof responseData,
            data: JSON.stringify(responseData).substring(0, 200)
          });
          
          return result;
        } catch (error) {
          const errorResult: WebhookErrorResult = {
            url,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
          console.error(`Error sending to webhook ${url}:`, errorResult);
          return errorResult;
        }
      }));

      // Prepare webhook responses for successful attempts only
      const webhookResponses = webhookResults.reduce((acc: Record<string, any>, result: PromiseSettledResult<WebhookResult>) => {
        if (result.status === 'fulfilled' && (result as PromiseFulfilledResult<WebhookResult>).value.success) {
          // Get a descriptive key based on the URL
          let urlKey = 'unknown';
          const url = (result as PromiseFulfilledResult<WebhookResult>).value.url;
          
          if (url.includes('linkedin-replies')) {
            urlKey = 'linkedin';
          } else if (url.includes('sending-replies')) {
            urlKey = url.includes('webhook-test') ? 'emailTest' : 'email';
          }
          
          acc[urlKey] = (result as PromiseFulfilledResult<WebhookSuccessResult>).value.data;
        }
        return acc;
      }, {} as Record<string, any>);

      // Get the latest message in the thread to check its status using raw SQL
      const latestThreadMessages: { status: string }[] = await prisma.$queryRaw(
        Prisma.sql`SELECT status FROM "EmailMessage" 
                   WHERE "threadId" = ${originalMessage.threadId} 
                   AND "organizationId" = ${session.user.organizationId} 
                   ORDER BY "receivedAt" DESC 
                   LIMIT 1`
      );
      const latestThreadMessage = latestThreadMessages.length > 0 ? latestThreadMessages[0] : null;

      // We're no longer creating the database entry directly
      // N8n will handle this when it receives the webhook
      logDebug('Letting N8n handle message creation in database for consistent timing', {
        messageId: newMessageId,
        threadId: originalMessage.threadId,
        messageSource: originalMessage.messageSource
      });

      // --- ADDED: Log the successful reply ---
      try {
        await prisma.replyLog.create({
          data: {
            userEmail: session.user.email, // Checked for existence at the start
            messageId: newMessageId,
            threadId: originalMessage.threadId,
            organizationId: session.user.organizationId,
            // repliedAt defaults to now()
          }
        });
        logDebug('Successfully logged reply event', { userEmail: session.user.email, messageId: newMessageId });
      } catch (logError) {
        // Log the error but don't fail the main reply operation
        console.error('Failed to log reply event:', logError);
      }
      // --- END ADDED ---

      // Store the response in a scoped variable
      const response = {
        message: 'Reply sent to webhook. N8n will create the message record',
        messageId: newMessageId,
        webhookResponses: Object.keys(webhookResponses).length > 0 ? webhookResponses : undefined,
        messageSource: isLinkedInMessage ? 'LINKEDIN' : 'EMAIL'
      };

      logDebug('Reply process completed successfully', {
        messageId: newMessageId,
        webhookResponseKeys: Object.keys(webhookResponses)
      });

      return NextResponse.json(response);

    } catch (error) {
      console.error('Error sending reply:', error);
      return NextResponse.json(
        { 
          error: 'Failed to send reply',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in reply endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatEmailContent(content: string, originalMessage: any): string {
  // Process message content
  // Simple implementation - wrap in a div
  return `<div>${content.replace(/\n/g, '<br/>')}</div>`;
}
