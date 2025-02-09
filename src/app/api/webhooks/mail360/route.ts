import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MessageType } from '@prisma/client';

// Force dynamic API route
export const dynamic = 'force-dynamic';

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
      // Handle both regular and pre-stringified JSON
      data = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
    } catch (parseError) {
      console.error('Failed to parse webhook data:', {
        error: parseError,
        rawBody: rawBody.slice(0, 1000) // Log first 1000 chars only
      });
      return NextResponse.json(
        { error: 'Invalid JSON data', details: parseError instanceof Error ? parseError.message : String(parseError) },
        { status: 400 }
      );
    }

    console.log('Parsed webhook data:', {
      data,
      headers: Object.fromEntries(request.headers)
    });
    
    // Find email account by Mail360 account key (case-insensitive)
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        OR: [
          { mail360AccountKey: data.account_key },
          { mail360AccountKey: data.account_key.toUpperCase() },
          { mail360AccountKey: data.account_key.toLowerCase() }
        ]
      }
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
        { error: 'Email account not found' },
        { status: 404 }
      );
    }

    console.log('Found email account:', {
      id: emailAccount.id,
      email: emailAccount.email,
      organizationId: emailAccount.organizationId
    });
    
    // Store message in database with minimal fields
    const message = await prisma.emailMessage.create({
      data: {
        messageId: data.message_id,
        threadId: data.thread_id || data.message_id,
        organizationId: emailAccount.organizationId,
        emailAccountId: emailAccount.id,
        subject: data.subject || 'No Subject',
        sender: data.from_address || data.sender || 'Unknown Sender',
        recipientEmail: data.delivered_to || data.to_address || emailAccount.email,
        content: data.content || data.summary || '',
        receivedAt: new Date(parseInt(data.received_time || Date.now().toString())),
        messageType: MessageType.OTHER // Default type for now
      }
    });
    
    console.log('Message stored:', {
      id: message.id,
      messageId: message.messageId
    });
    
    return NextResponse.json({
      success: true,
      messageId: message.id
    });
    
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
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 