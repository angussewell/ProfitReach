import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MessageType } from '@prisma/client';
import { z } from 'zod';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Define webhook data schema
const mail360WebhookSchema = z.object({
  account_key: z.string(),
  message_id: z.string(),
  thread_id: z.string().optional(),
  subject: z.string().optional(),
  from_address: z.string().optional(),
  sender: z.string().optional(),
  delivered_to: z.string().optional(),
  to_address: z.string().optional(),
  summary: z.string().optional(),
  content: z.string().optional(),
  received_time: z.string().optional(),
  return_path: z.string().optional()
});

type Mail360WebhookData = z.infer<typeof mail360WebhookSchema>;

type ClassificationScore = Record<string, number>;

interface ClassificationResult {
  type: MessageType;
  scores: ClassificationScore;
}

function classifyMessage(data: Mail360WebhookData): ClassificationResult {
  const scores: ClassificationScore = {
    bounce: 0,
    autoReply: 0,
    outOfOffice: 0,
    realReply: 0
  };
  
  // Sender patterns for bounces
  const sender = (data.sender || data.from_address || '').toLowerCase();
  if (sender.includes('mailer-daemon')) scores.bounce += 0.8;
  if (sender.includes('postmaster')) scores.bounce += 0.6;
  if (data.return_path?.includes('bounce')) scores.bounce += 0.5;
  
  // Subject patterns
  const subject = (data.subject || '').toLowerCase();
  if (subject.match(/out of( the)? office/i)) scores.outOfOffice += 0.7;
  if (subject.match(/automatic reply/i)) scores.autoReply += 0.7;
  if (subject.match(/auto( |-)?reply/i)) scores.autoReply += 0.7;
  if (subject.match(/delivery (status notification|failed)/i)) scores.bounce += 0.7;
  
  // Content patterns
  const content = (data.content || data.summary || '').toLowerCase();
  if (content.includes('out of office')) scores.outOfOffice += 0.6;
  if (content.includes('automatic reply')) scores.autoReply += 0.6;
  if (content.includes('delivery failed')) scores.bounce += 0.6;
  
  // Determine message type
  const maxScore = Math.max(...Object.values(scores));
  let type: MessageType = MessageType.REAL_REPLY;
  
  if (maxScore > 0.6) {
    if (scores.bounce > scores.autoReply && scores.bounce > scores.outOfOffice) {
      type = MessageType.BOUNCE;
    } else if (scores.autoReply > scores.outOfOffice) {
      type = MessageType.AUTO_REPLY;
    } else if (scores.outOfOffice > 0) {
      type = MessageType.OUT_OF_OFFICE;
    }
  }
  
  return { type, scores };
}

// Add GET handler for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: Request) {
  try {
    console.log('Received Mail360 webhook request');
    
    // Parse and validate webhook data
    const data = await request.json();
    console.log('Webhook payload:', {
      ...data,
      headers: Object.fromEntries(request.headers)
    });
    
    const validationResult = mail360WebhookSchema.safeParse(data);
    
    if (!validationResult.success) {
      console.error('Invalid webhook data:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid webhook data', details: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const webhookData = validationResult.data;
    
    // Find email account by Mail360 account key (case-insensitive)
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        OR: [
          { mail360AccountKey: webhookData.account_key },
          { mail360AccountKey: webhookData.account_key.toUpperCase() },
          { mail360AccountKey: webhookData.account_key.toLowerCase() }
        ]
      }
    });
    
    if (!emailAccount) {
      console.error('Email account not found:', {
        attempted_key: webhookData.account_key,
        attempted_key_upper: webhookData.account_key.toUpperCase(),
        attempted_key_lower: webhookData.account_key.toLowerCase(),
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
      organizationId: emailAccount.organizationId,
      mail360AccountKey: emailAccount.mail360AccountKey
    });

    // Classify message
    const { type: messageType, scores } = classifyMessage(webhookData);
    
    // Store message in database
    const message = await prisma.emailMessage.create({
      data: {
        messageId: webhookData.message_id,
        threadId: webhookData.thread_id || webhookData.message_id,
        organizationId: emailAccount.organizationId,
        emailAccountId: emailAccount.id,
        subject: webhookData.subject || 'No Subject',
        sender: webhookData.from_address || webhookData.sender || 'Unknown Sender',
        recipientEmail: webhookData.delivered_to || webhookData.to_address || emailAccount.email,
        content: webhookData.content || webhookData.summary || '',
        receivedAt: new Date(parseInt(webhookData.received_time || Date.now().toString())),
        messageType,
        classificationScores: scores
      }
    });
    
    console.log('Message stored:', {
      id: message.id,
      messageId: message.messageId,
      type: messageType
    });
    
    return NextResponse.json({
      success: true,
      messageId: message.id
    });
  } catch (error) {
    console.error('Error processing Mail360 webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
} 