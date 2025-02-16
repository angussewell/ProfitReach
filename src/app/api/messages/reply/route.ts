import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { UnipileClient } from '@/lib/unipile';
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

    // Send reply via Unipile
    const unipileClient = new UnipileClient();
    const response = await unipileClient.sendReply({
      accountId: emailAccount.unipileAccountId,
      messageId: originalMessage.messageId,
      from: emailAccount.email,
      content: formatEmailContent(validatedData.content, originalMessage),
      subject: formatReplySubject(originalMessage.subject || 'Re: No Subject'),
      replyType: validatedData.action,
      to: validatedData.toAddress || originalMessage.sender,
      cc: validatedData.ccAddress,
      bcc: validatedData.bccAddress,
      format: 'html',
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
        recipientEmail: response.to,
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
      message: 'Reply sent successfully',
      messageId: response.messageId
    });
  } catch (error) {
    console.error('Error sending reply:', error);
    return NextResponse.json(
      { error: 'Failed to send reply' },
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