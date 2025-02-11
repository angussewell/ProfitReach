import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MessageType, Prisma } from '@prisma/client';
import { z } from 'zod';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Define webhook data schema
const UnipileMessageWebhook = z.object({
  message_id: z.string(),
  thread_id: z.string().optional(),
  account_id: z.string(),
  subject: z.string(),
  from: z.string(),
  to: z.string(),
  content: z.string(),
  received_at: z.string().optional()
});

type UnipileMessageData = z.infer<typeof UnipileMessageWebhook>;

// Helper function to classify message type
function classifyMessageType(data: UnipileMessageData): MessageType {
  const subject = (data.subject || '').toLowerCase();
  const content = (data.content || '').toLowerCase();
  const sender = (data.from || '').toLowerCase();
  const rawSubject = data.subject || '';
  const rawContent = data.content || '';

  // Check for warm-up email patterns (random strings)
  const warmupPattern = /[A-Z0-9]{8,}/;
  const subjectMatches = rawSubject.match(warmupPattern) || [];
  const contentMatches = rawContent.match(warmupPattern) || [];
  
  if (subjectMatches.length > 0 || contentMatches.length > 0) {
    console.log('Detected warm-up email pattern:', {
      subject: rawSubject,
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

  // Check for marketing/spam indicators
  const marketingIndicators = [
    'unsubscribe',
    'newsletter',
    'special offer',
    'limited time',
    'click here',
    'subscribe',
    'promotion',
    'discount',
    'sale',
    'marketing',
    'advertisement',
    'deal',
    'coupon',
    'off your purchase',
    'free trial',
    'buy now',
    'limited offer',
    'exclusive offer',
    'best price',
    'best deal',
    'act now',
    'don\'t miss out',
    'one time offer',
    'congratulations',
    'winner',
    'selected',
    'earn money',
    'make money',
    'get rich',
    'work from home',
    'business opportunity',
    'investment opportunity'
  ];

  // Check for marketing/spam patterns
  if (marketingIndicators.some(indicator => 
    subject.includes(indicator) || content.includes(indicator)
  )) {
    return MessageType.OTHER;
  }

  // Check for system-generated patterns
  if (
    sender.includes('noreply') ||
    sender.includes('no-reply') ||
    sender.includes('donotreply') ||
    sender.includes('do-not-reply') ||
    sender.includes('system') ||
    sender.includes('notification') ||
    sender.includes('alert') ||
    sender.includes('info@') ||
    sender.includes('support@') ||
    sender.includes('hello@') ||
    sender.includes('contact@')
  ) {
    return MessageType.OTHER;
  }

  // If none of the above, it's likely a real reply
  return MessageType.REAL_REPLY;
}

export async function POST(request: Request) {
  try {
    console.log('Received Unipile message webhook request');
    
    // Parse and validate webhook data
    let data: UnipileMessageData;
    const rawBody = await request.text();
    
    console.log('Raw webhook body:', rawBody);
    
    try {
      const parsedData = JSON.parse(rawBody);
      data = UnipileMessageWebhook.parse(parsedData);
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

    // Find email account by Unipile account ID
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        unipileAccountId: data.account_id
      }
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
        sender: data.from
      });

      const message = await prisma.emailMessage.create({
        data: {
          messageId: data.message_id,
          threadId: data.thread_id || data.message_id, // Use message_id as fallback
          organizationId: emailAccount.organizationId,
          emailAccountId: emailAccount.id,
          subject: data.subject,
          sender: data.from,
          recipientEmail: data.to,
          content: data.content,
          receivedAt: new Date(data.received_at || Date.now()),
          messageType: messageType
        }
      });
      
      // If this is a real reply, try to update scenario message
      if (messageType === MessageType.REAL_REPLY) {
        try {
          // Find the original message in ScenarioMessage table
          const scenarioMessage = await prisma.scenarioMessage.findFirst({
            where: {
              threadId: data.thread_id || data.message_id,
              sender: data.from
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
              threadId: data.thread_id || data.message_id,
              sender: data.from,
              scenarioId: scenarioMessage.scenarioId
            });
          }
        } catch (error) {
          // Log error but don't fail the webhook
          console.error('Failed to update scenario message:', {
            error: error instanceof Error ? error.message : String(error),
            threadId: data.thread_id || data.message_id,
            sender: data.from
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