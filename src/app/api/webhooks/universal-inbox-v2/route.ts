import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { MessageType } from '@prisma/client';

// Define webhook data schema - only the fields we need
const UniversalInboxWebhookV2 = z.object({
  // Required fields from n8n
  message_id: z.string(),
  thread_id: z.string(),
  unipile_email_id: z.string(),
  organizationId: z.string(),
  email_account_id: z.string().describe('The Unipile account ID'), // Clarify this is Unipile's ID
  subject: z.string(),
  sender: z.string(),
  recipient_email: z.string(),
  content: z.string(),
  // removed message_type and received_at as they're no longer needed
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
        unipile_account_id: data.email_account_id // Log the Unipile account ID
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
          subject: data.subject,
          sender: data.sender,
          recipientEmail: data.recipient_email,
          content: data.content,
          receivedAt: new Date(),
          messageType: MessageType.REAL_REPLY,
          unipileEmailId: data.unipile_email_id
        }
      });

      console.log('Successfully stored message:', {
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