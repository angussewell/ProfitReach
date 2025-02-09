import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Mail360Client } from '@/lib/mail360';

// Force dynamic API route
export const dynamic = 'force-dynamic';

type MessageType = 'REAL_REPLY' | 'BOUNCE' | 'AUTO_REPLY' | 'OUT_OF_OFFICE' | 'OTHER';

// Webhook payload schema from Mail360
const mail360WebhookSchema = z.object({
  account_key: z.string(),
  message_id: z.string()
});

type ClassificationScore = Record<string, number>;

function classifyMessage(message: any): {
  type: MessageType;
  scores: ClassificationScore;
} {
  const scores: ClassificationScore = {
    bounce: 0,
    autoReply: 0,
    outOfOffice: 0,
    realReply: 0
  };
  
  // Sender patterns for bounces
  if (message.sender?.toLowerCase().includes('mailer-daemon')) scores.bounce += 0.8;
  if (message.sender?.toLowerCase().includes('postmaster')) scores.bounce += 0.6;
  if (message.return_path?.includes('bounce')) scores.bounce += 0.5;
  
  // Subject patterns
  const subject = message.subject?.toLowerCase() || '';
  if (subject.match(/out of( the)? office/i)) scores.outOfOffice += 0.7;
  if (subject.match(/automatic reply/i)) scores.autoReply += 0.7;
  if (subject.match(/auto( |-)?reply/i)) scores.autoReply += 0.7;
  if (subject.match(/delivery (status notification|failed)/i)) scores.bounce += 0.7;
  
  // Content patterns
  const content = message.content?.toLowerCase() || '';
  if (content.includes('out of office')) scores.outOfOffice += 0.6;
  if (content.includes('automatic reply')) scores.autoReply += 0.6;
  if (content.includes('delivery failed')) scores.bounce += 0.6;
  
  // Determine message type
  const maxScore = Math.max(...Object.values(scores));
  let type: MessageType = 'REAL_REPLY';
  
  if (maxScore > 0.6) {
    if (scores.bounce > scores.autoReply && scores.bounce > scores.outOfOffice) {
      type = 'BOUNCE';
    } else if (scores.autoReply > scores.outOfOffice) {
      type = 'AUTO_REPLY';
    } else if (scores.outOfOffice > 0) {
      type = 'OUT_OF_OFFICE';
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
    console.log('Webhook payload:', data);
    
    const validationResult = mail360WebhookSchema.safeParse(data);
    
    if (!validationResult.success) {
      console.error('Invalid webhook data:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid webhook data', details: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const webhookData = validationResult.data;
    
    // Find email account by Mail360 account key
    const emailAccount = await prisma.emailAccount.findFirst({
      where: { mail360AccountKey: webhookData.account_key },
      include: { organization: true }
    });
    
    if (!emailAccount) {
      console.error('Email account not found:', webhookData.account_key);
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

    // Fetch full message details from Mail360
    const mail360Client = new Mail360Client();
    const message = await mail360Client.getMessage(webhookData.account_key, webhookData.message_id);
    const messageContent = await mail360Client.getMessageContent(webhookData.account_key, webhookData.message_id);
    
    // Combine message details with content
    const fullMessage = {
      ...message,
      content: messageContent.content
    };
    
    // Classify message
    const { type: messageType, scores } = classifyMessage(fullMessage);
    
    console.log('Message classified:', {
      type: messageType,
      scores,
      messageId: webhookData.message_id
    });
    
    // Store message in database
    const result = await prisma.emailMessage.create({
      data: {
        messageId: webhookData.message_id,
        threadId: (fullMessage.thread_id as string) || webhookData.message_id,
        organizationId: emailAccount.organizationId,
        emailAccountId: emailAccount.id,
        subject: (fullMessage.subject as string) || 'No Subject',
        sender: (fullMessage.from_address as string) || (fullMessage.sender as string) || 'Unknown Sender',
        recipientEmail: (fullMessage.delivered_to as string) || (fullMessage.to_address as string) || emailAccount.email,
        content: (fullMessage.content as string) || (fullMessage.summary as string) || '',
        receivedAt: new Date(parseInt((fullMessage.received_time as string)) || Date.now()),
        messageType,
        classificationScores: scores
      }
    });
    
    console.log('Message stored:', {
      id: result.id,
      messageId: result.messageId,
      type: messageType
    });
    
    return NextResponse.json({
      success: true,
      messageId: result.id,
      messageType
    });
  } catch (error) {
    console.error('Error processing Mail360 webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
} 