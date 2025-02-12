import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MessageType, Prisma } from '@prisma/client';
import { z } from 'zod';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Define webhook data schema
const UniversalInboxWebhook = z.object({
  event: z.literal('mail_received'),
  email_id: z.string(),
  account_id: z.string(),
  webhook_name: z.string(),
  date: z.string(),
  from_attendee: z.object({
    display_name: z.string(),
    identifier: z.string(),
    identifier_type: z.literal('EMAIL_ADDRESS')
  }),
  to_attendees: z.array(z.object({
    display_name: z.string(),
    identifier: z.string(),
    identifier_type: z.literal('EMAIL_ADDRESS')
  })),
  subject: z.string(),
  body: z.string(),
  body_plain: z.string(),
  message_id: z.string(),
  provider_id: z.string(),
  read_date: z.string().nullable(),
  is_complete: z.boolean(),
  has_attachments: z.boolean(),
  attachments: z.array(z.any()),
  folders: z.array(z.string()),
  role: z.string(),
  origin: z.string(),
  in_reply_to: z.object({
    message_id: z.string(),
    id: z.string()
  }).optional()
});

type UniversalInboxData = z.infer<typeof UniversalInboxWebhook>;

// Helper function to classify message type
function classifyMessageType(data: UniversalInboxData): MessageType {
  const subject = data.subject.toLowerCase();
  const content = data.body_plain.toLowerCase();
  const sender = data.from_attendee.identifier.toLowerCase();
  
  // Use folders information for better classification
  if (data.folders.includes('SENT')) {
    return MessageType.OTHER;
  }

  // Check for warm-up email patterns (random strings)
  const warmupPattern = /[A-Z0-9]{8,}/;
  const subjectMatches = data.subject.match(warmupPattern) || [];
  const contentMatches = data.body_plain.match(warmupPattern) || [];
  
  if (subjectMatches.length > 0 || contentMatches.length > 0) {
    console.log('Detected warm-up email pattern:', {
      subject: data.subject,
      subjectMatches,
      contentMatches
    });
    return MessageType.OTHER;
  }

  // Check for auto-replies first
  if (
    subject.includes('automatic reply') ||
    subject.includes('auto reply') ||
    subject.includes('auto-reply') ||
    content.includes('this is an automated response') ||
    content.includes('auto-generated message') ||
    content.includes('do not reply to this email')
  ) {
    return MessageType.AUTO_REPLY;
  }

  // Check for out of office
  if (
    subject.includes('out of office') ||
    subject.includes('ooo:') ||
    content.includes('i am out of the office') ||
    content.includes('i will be out of office') ||
    content.includes('i am currently out of office')
  ) {
    return MessageType.OUT_OF_OFFICE;
  }

  // Check for bounces
  if (
    subject.includes('delivery status notification') ||
    subject.includes('undeliverable') ||
    subject.includes('failed delivery') ||
    subject.includes('delivery failure') ||
    content.includes('message could not be delivered') ||
    content.includes('delivery has failed')
  ) {
    return MessageType.BOUNCE;
  }

  // If it's a reply to another message, classify as REAL_REPLY
  if (data.in_reply_to) {
    return MessageType.REAL_REPLY;
  }

  // Default to REAL_REPLY for external messages
  if (data.origin === 'external') {
    return MessageType.REAL_REPLY;
  }

  return MessageType.OTHER;
}

export async function POST(request: Request) {
  try {
    console.log('Received Universal Inbox webhook request');
    
    // Parse and validate webhook data
    let data: UniversalInboxData;
    const rawBody = await request.text();
    
    console.log('Raw webhook body:', rawBody);
    
    try {
      const parsedData = JSON.parse(rawBody);
      data = UniversalInboxWebhook.parse(parsedData);
      console.log('Parsed webhook data:', data);

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

    // Find email account by account ID
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        unipileAccountId: data.account_id
      } as Prisma.EmailAccountWhereInput
    });

    if (!emailAccount) {
      console.error('Email account not found:', {
        unipileAccountId: data.account_id
      });
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      );
    }

    // Store message in database
    try {
      const messageType = classifyMessageType(data);
      console.log('Classified message type:', {
        type: messageType,
        subject: data.subject,
        sender: data.from_attendee.identifier
      });

      const message = await prisma.emailMessage.create({
        data: {
          messageId: data.message_id,
          threadId: data.in_reply_to?.message_id || data.message_id, // Use in_reply_to message_id if available
          organizationId: emailAccount.organizationId,
          emailAccountId: emailAccount.id,
          subject: data.subject,
          sender: data.from_attendee.identifier,
          recipientEmail: data.to_attendees[0]?.identifier || '',
          content: data.body_plain,
          receivedAt: new Date(data.date),
          messageType: messageType
        }
      });
      
      // If this is a real reply, try to update scenario message
      if (messageType === MessageType.REAL_REPLY) {
        try {
          // Find the original message in ScenarioMessage table
          const scenarioMessage = await prisma.scenarioMessage.findFirst({
            where: {
              threadId: data.in_reply_to?.message_id || data.message_id,
              sender: data.from_attendee.identifier
            }
          });

          if (scenarioMessage) {
            // Update hasReplied status
            await prisma.scenarioMessage.update({
              where: { id: scenarioMessage.id },
              data: { 
                hasReplied: true,
                updatedAt: new Date()
              }
            });

            console.log('Updated scenario message reply status:', {
              threadId: data.in_reply_to?.message_id || data.message_id,
              sender: data.from_attendee.identifier,
              scenarioId: scenarioMessage.scenarioId
            });
          }
        } catch (error) {
          // Log error but don't fail the webhook
          console.error('Failed to update scenario message:', {
            error: error instanceof Error ? error.message : String(error),
            threadId: data.in_reply_to?.message_id || data.message_id,
            sender: data.from_attendee.identifier
          });
        }
      }
      
      console.log('Message stored:', {
        id: message.id,
        messageId: message.messageId
      });
      
      return NextResponse.json({
        success: true,
        messageId: message.id
      });
    } catch (error) {
      // Check for unique constraint violation
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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