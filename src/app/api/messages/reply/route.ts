import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Mail360Client } from '@/lib/mail360';
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

export async function POST(request: Request) {
  try {
    // Check Mail360 environment variables first
    const requiredEnvVars = {
      'MAIL360_CLIENT_ID': process.env.MAIL360_CLIENT_ID,
      'MAIL360_CLIENT_SECRET': process.env.MAIL360_CLIENT_SECRET,
      'MAIL360_REFRESH_TOKEN': process.env.MAIL360_REFRESH_TOKEN,
    };

    const missingEnvVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingEnvVars.length > 0) {
      console.error('Missing required Mail360 environment variables:', missingEnvVars);
      return NextResponse.json(
        { 
          error: 'Mail360 configuration error',
          details: `Missing environment variables: ${missingEnvVars.join(', ')}`
        },
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received reply request:', {
      ...body,
      content: body.content?.slice(0, 100) + '...' // Log first 100 chars of content
    });

    const validatedData = replyRequestSchema.parse(body);

    // Get the original message to get the account info
    const originalMessage = await prisma.emailMessage.findUnique({
      where: { messageId: validatedData.messageId },
      include: {
        emailAccount: true,
      },
    });

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
    });

    if (!emailAccount) {
      console.error('Email account not found:', fromEmail);
      return NextResponse.json(
        { error: 'Selected email account not found' },
        { status: 404 }
      );
    }

    // Validate Mail360 account key
    if (!emailAccount.mail360AccountKey) {
      console.error('Mail360 account key missing for account:', emailAccount.email);
      return NextResponse.json(
        { error: 'Email account is not properly configured with Mail360' },
        { status: 400 }
      );
    }

    let mail360Client;
    try {
      mail360Client = new Mail360Client();
    } catch (error) {
      console.error('Failed to initialize Mail360 client:', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      });
      return NextResponse.json(
        { error: 'Mail360 configuration error. Please check environment variables.' },
        { status: 500 }
      );
    }

    // Format subject if not provided
    const subject = validatedData.subject || formatReplySubject(originalMessage.subject || 'Re: No Subject');

    // Prepare reply parameters
    const replyParams = {
      accountKey: emailAccount.mail360AccountKey,
      messageId: originalMessage.messageId,
      fromAddress: emailAccount.email,
      content: formatEmailContent(validatedData.content, originalMessage),
      subject,
      action: validatedData.action,
      toAddress: validatedData.toAddress || originalMessage.sender,
      ccAddress: validatedData.ccAddress,
      bccAddress: validatedData.bccAddress,
      mailFormat: 'html' as const,
    };

    console.log('Sending reply with params:', {
      ...replyParams,
      content: replyParams.content.slice(0, 100) + '...' // Log first 100 chars of content
    });

    // Send reply through Mail360
    const result = await mail360Client.sendReply(replyParams);

    console.log('Reply sent successfully:', {
      messageId: result.messageId,
      subject: result.subject
    });

    // Store the reply in our database
    const storedReply = await prisma.emailMessage.create({
      data: {
        messageId: result.messageId,
        threadId: originalMessage.threadId,
        organizationId: session.user.organizationId,
        emailAccountId: emailAccount.id,
        subject: result.subject,
        sender: emailAccount.email,
        recipientEmail: result.toAddress,
        content: validatedData.content,
        messageType: 'REAL_REPLY',
        receivedAt: new Date(),
        isRead: true,
      },
    });

    console.log('Stored reply in database:', {
      messageId: storedReply.messageId,
      threadId: storedReply.threadId
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error sending reply:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      type: typeof error
    });

    // Determine if it's a validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to send reply',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function formatReplySubject(originalSubject: string): string {
  if (!originalSubject) return 'Re: No Subject';
  
  const rePrefix = /^(Re:|RE:|re:|रे:|返信:|回复:|답장:)\s*/;
  return rePrefix.test(originalSubject)
    ? originalSubject
    : `Re: ${originalSubject}`;
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