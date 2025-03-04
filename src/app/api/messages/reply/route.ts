import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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
});

// Webhook URLs
const WEBHOOK_URLS = [
  'https://messagelm.app.n8n.cloud/webhook-test/sending-replies',
  'https://messagelm.app.n8n.cloud/webhook/sending-replies'
];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received reply request:', {
      ...body,
      content: body.content?.slice(0, 100) + '...' // Log first 100 chars of content
    });

    let validatedData;
    try {
      validatedData = replyRequestSchema.parse(body);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return NextResponse.json(
        { error: 'Invalid request data', details: validationError instanceof Error ? validationError.message : String(validationError) },
        { status: 400 }
      );
    }

    // Get the original message to get the account info
    const originalMessage = await prisma.emailMessage.findUnique({
      where: { messageId: validatedData.messageId },
      include: {  // Use include instead of select to get all fields
        emailAccount: true
      }
    }) as any; // Type assertion to handle unipileEmailId

    if (!originalMessage) {
      console.error('Original message not found:', validatedData.messageId);
      return NextResponse.json(
        { error: 'Original message not found' },
        { status: 404 }
      );
    }

    // Verify organization access
    if (originalMessage.organizationId !== session.user.organizationId) {
      console.error('Organization mismatch:', {
        messageOrg: originalMessage.organizationId,
        userOrg: session.user.organizationId
      });
      return NextResponse.json(
        { error: 'Access denied to this message' },
        { status: 403 }
      );
    }

    // Get the email account to send from (either specified or original recipient)
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
      // Prepare webhook payload with ALL available information
      const webhookPayload = {
        internalEmailId: originalMessage.id,
        messageId: originalMessage.messageId,
        threadId: originalMessage.threadId,
        unipileEmailId: originalMessage.unipileEmailId,
        internalAccountId: emailAccount.id,
        unipileAccountId: emailAccount.unipileAccountId,
        organizationId: session.user.organizationId,
        subject: originalMessage.subject || 'No Subject',
        content: formatEmailContent(validatedData.content, originalMessage),
        plainContent: validatedData.content,
        fromEmail: emailAccount.email,
        fromName: emailAccount.name,
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
          emailAccountId: originalMessage.emailAccountId
        },
        timestamp: new Date().toISOString(),
        replyType: validatedData.action,
        isHtml: true
      };

      console.log('Sending webhook payload:', webhookPayload);

      // Send to both webhooks and collect results
      const webhookResults = await Promise.allSettled(WEBHOOK_URLS.map(async (url) => {
        try {
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

          return {
            url,
            success: response.ok,
            status: response.status,
            data: responseData
          };
        } catch (error) {
          return {
            url,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }));

      // Log webhook results
      console.log('Webhook results:', webhookResults);

      // Check if at least one webhook succeeded
      const anyWebhookSucceeded = webhookResults.some(
        result => result.status === 'fulfilled' && result.value.success
      );

      if (!anyWebhookSucceeded) {
        throw new Error('All webhook attempts failed');
      }

      // Get the latest message in the thread to check its status
      const latestThreadMessage = await prisma.emailMessage.findFirst({
        where: {
          threadId: originalMessage.threadId,
          organizationId: session.user.organizationId
        },
        orderBy: {
          receivedAt: 'desc'
        },
        select: {
          status: true
        }
      });

      // Generate a unique message ID for our database
      const newMessageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store the reply in our database
      const storedReply = await prisma.emailMessage.create({
        data: {
          messageId: newMessageId,
          threadId: originalMessage.threadId,
          organizationId: session.user.organizationId,
          emailAccountId: emailAccount.id,
          subject: originalMessage.subject || 'No Subject', // Remove Re: prefix logic
          sender: emailAccount.email,
          recipientEmail: validatedData.toAddress || originalMessage.sender,
          content: validatedData.content,
          messageType: 'REAL_REPLY',
          receivedAt: new Date(),
          isRead: true,
          // Maintain the existing status if it exists, otherwise default to FOLLOW_UP_NEEDED
          status: latestThreadMessage?.status || 'FOLLOW_UP_NEEDED'
        },
      });

      console.log('Stored reply in database:', {
        messageId: storedReply.messageId,
        threadId: storedReply.threadId
      });

      // Prepare webhook responses for successful attempts only
      const webhookResponses = webhookResults.reduce((acc, result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          const urlKey = result.value.url.includes('webhook-test') ? 'test' : 'main';
          acc[urlKey] = result.value.data;
        }
        return acc;
      }, {} as Record<string, any>);

      return NextResponse.json({
        message: 'Reply sent successfully',
        messageId: storedReply.messageId,
        webhookResponses: Object.keys(webhookResponses).length > 0 ? webhookResponses : undefined
      });

    } catch (webhookError) {
      console.error('Webhook error:', {
        error: webhookError instanceof Error ? {
          message: webhookError.message,
          stack: webhookError.stack,
          name: webhookError.name
        } : webhookError
      });

      return NextResponse.json(
        { 
          error: 'Failed to send reply via webhooks',
          details: webhookError instanceof Error ? webhookError.message : String(webhookError)
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error sending reply:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      type: typeof error
    });

    return NextResponse.json(
      { 
        error: 'Failed to send reply',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

function formatEmailContent(content: string, originalMessage: any): string {
  const timestamp = new Date(originalMessage.receivedAt).toLocaleString();
  
  return `
    <div style="font-family: Arial, sans-serif;">
      ${content.replace(/\n/g, '<br>')}
      <br><br>
      <div style="padding: 10px 0; border-top: 1px solid #ddd; color: #666;">
        <p style="margin: 10px 0;">On ${timestamp}, ${originalMessage.sender} wrote:</p>
        <blockquote style="margin: 0 0 0 10px; padding-left: 10px; border-left: 2px solid #ddd;">
          ${originalMessage.content}
        </blockquote>
      </div>
    </div>
  `;
} 