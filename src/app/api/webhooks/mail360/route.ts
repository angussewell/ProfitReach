import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MessageType, Prisma } from '@prisma/client';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Helper function to classify message type
function classifyMessageType(data: any): MessageType {
  const subject = (data.subject || '').toLowerCase();
  const content = (data.content || '').toLowerCase();
  const sender = (data.from_address || '').toLowerCase();
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

// Add GET handler for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: Request) {
  try {
    console.log('Received Mail360 webhook request');
    
    // Parse and validate webhook data
    let data;
    const rawBody = await request.text();
    
    console.log('Raw webhook body:', rawBody);
    
    try {
      // Function to recursively unwrap JSON/string layers
      const unwrapData = (input: any): any => {
        // If it's a string, try to parse it
        if (typeof input === 'string') {
          try {
            return unwrapData(JSON.parse(input));
          } catch (e) {
            return input;
          }
        }
        
        // If it has a body property, unwrap it
        if (input && typeof input === 'object' && 'body' in input) {
          return unwrapData(input.body);
        }
        
        // Otherwise return as is
        return input;
      };

      // Unwrap all layers of the data
      data = unwrapData(rawBody);

      // Ensure we have an object
      if (typeof data !== 'object' || data === null) {
        throw new Error('Failed to parse request body into an object');
      }

      // Log the unwrapped data for debugging
      console.log('Unwrapped data:', data);

      // Clean and validate required fields
      const cleanData = {
        message_id: data.message_id || data.messageId || `generated_${Date.now()}`,
        thread_id: data.thread_id || data.threadId || data.message_id || `thread_${Date.now()}`,
        account_key: (data.account_key || data.accountKey || '').trim(),
        subject: data.subject || 'No Subject',
        from_address: data.from_address || data.sender || data.fromAddress || 'Unknown Sender',
        delivered_to: data.delivered_to || data.to_address || data.toAddress || '',
        content: data.content || data.summary || '',
        received_time: data.received_time || data.receivedTime || Date.now().toString()
      };

      console.log('Account key analysis:', {
        original: data.account_key || data.accountKey,
        cleaned: cleanData.account_key,
        containsWhitespace: /\s/.test(cleanData.account_key),
        specialChars: cleanData.account_key.match(/[^a-zA-Z0-9]/g),
        charCodes: [...cleanData.account_key].map(c => c.charCodeAt(0))
      });

      // Validate required fields
      const missingFields = [];
      if (!cleanData.account_key) missingFields.push('account_key');
      if (!cleanData.delivered_to) missingFields.push('delivered_to/to_address');

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Update our data reference
      data = cleanData;

    } catch (parseError) {
      console.error('Failed to parse webhook data:', {
        error: parseError,
        errorMessage: parseError instanceof Error ? parseError.message : String(parseError),
        rawBody: rawBody.slice(0, 1000), // Log first 1000 chars only
        requestHeaders: Object.fromEntries(request.headers)
      });
      return NextResponse.json(
        { 
          error: 'Invalid JSON data', 
          details: parseError instanceof Error ? parseError.message : String(parseError),
          help: 'Please ensure the request body is valid JSON and contains the required fields',
          required_fields: ['account_key', 'delivered_to']
        },
        { status: 400 }
      );
    }

    // Find email account by Mail360 account key (case-insensitive)
    console.log('Attempting to find account with key:', {
      raw_key: data.account_key,
      uppercase_key: data.account_key?.toUpperCase(),
      lowercase_key: data.account_key?.toLowerCase(),
      key_type: typeof data.account_key,
      key_length: data.account_key?.length
    });

    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        OR: [
          { mail360AccountKey: data.account_key },
          { mail360AccountKey: data.account_key?.toUpperCase() },
          { mail360AccountKey: data.account_key?.toLowerCase() }
        ]
      }
    });
    
    // Log all accounts for comparison
    const allAccounts = await prisma.emailAccount.findMany({
      select: {
        email: true,
        mail360AccountKey: true
      }
    });
    
    console.log('Database query results:', {
      searchKey: data.account_key,
      foundAccount: emailAccount ? {
        email: emailAccount.email,
        key: emailAccount.mail360AccountKey
      } : null,
      allAccounts: allAccounts
    });
    
    if (!emailAccount) {
      console.error('Email account not found:', {
        attempted_key: data.account_key,
        available_accounts: await prisma.emailAccount.findMany({
          select: { 
            email: true, 
            mail360AccountKey: true,
            id: true
          }
        })
      });
      return NextResponse.json(
        { 
          error: 'Email account not found',
          details: `No email account found with key: ${data.account_key}`,
          help: 'Please ensure you are using a valid Mail360 account key'
        },
        { status: 404 }
      );
    }

    console.log('Found email account:', {
      id: emailAccount.id,
      email: emailAccount.email,
      organizationId: emailAccount.organizationId
    });
    
    // Store message in database with minimal fields
    try {
      const messageType = classifyMessageType(data);
      console.log('Classified message type:', {
        type: messageType,
        subject: data.subject,
        sender: data.from_address
      });

      const message = await prisma.emailMessage.create({
        data: {
          messageId: data.message_id,
          threadId: data.thread_id,
          organizationId: emailAccount.organizationId,
          emailAccountId: emailAccount.id,
          subject: data.subject,
          sender: data.from_address,
          recipientEmail: data.delivered_to,
          content: data.content,
          receivedAt: new Date(parseInt(data.received_time)),
          messageType: messageType
        }
      });
      
      // If this is a real reply, try to update scenario message
      if (messageType === MessageType.REAL_REPLY) {
        try {
          // Find the original message in ScenarioMessage table
          const scenarioMessage = await prisma.scenarioMessage.findFirst({
            where: {
              threadId: data.thread_id,
              sender: data.from_address
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
              threadId: data.thread_id,
              sender: data.from_address,
              scenarioId: scenarioMessage.scenarioId
            });
          }
        } catch (error) {
          // Log error but don't fail the webhook
          console.error('Failed to update scenario message:', {
            error: error instanceof Error ? error.message : String(error),
            threadId: data.thread_id,
            sender: data.from_address
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