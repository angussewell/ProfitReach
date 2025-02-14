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

    // Validate email account configuration
    if (!emailAccount.unipileAccountId) {
      return NextResponse.json(
        { error: 'Email account not properly configured' },
        { status: 400 }
      );
    }

    // Send reply via Mail360
    const mail360Client = new Mail360Client();
    const response = await mail360Client.sendReply({
      accountKey: emailAccount.unipileAccountId,
      messageId: originalMessage.messageId,
      fromAddress: emailAccount.email,
      content: formatEmailContent(validatedData.content, originalMessage),
      subject: formatReplySubject(originalMessage.subject || 'Re: No Subject'),
      action: validatedData.action,
      toAddress: validatedData.toAddress || originalMessage.sender,
      ccAddress: validatedData.ccAddress,
      bccAddress: validatedData.bccAddress,
      mailFormat: 'html' as const,
    });

    console.log('Reply sent successfully:', {
      messageId: response.messageId,
      subject: response.subject
    });

    // Store the reply in our database
    const storedReply = await prisma.emailMessage.create({
      data: {
        messageId: response.messageId,
        threadId: originalMessage.threadId,
        organizationId: session.user.organizationId,
        emailAccountId: emailAccount.id,
        subject: response.subject,
        sender: emailAccount.email,
        recipientEmail: response.toAddress,
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
      messageId: response.messageId,
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