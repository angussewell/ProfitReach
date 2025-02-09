import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

type MessageType = 'REAL_REPLY' | 'BOUNCE' | 'AUTO_REPLY' | 'OUT_OF_OFFICE' | 'OTHER';

// Webhook payload schema from Mail360
const mail360WebhookSchema = z.object({
  summary: z.string(),
  transaction_id: z.string(),
  delivered_to: z.string(),
  subject: z.string(),
  bcc_address: z.string().optional(),
  parent_message_id: z.string(),
  account_key: z.string(),
  read_status: z.number(),
  has_attachment: z.boolean(),
  message_id: z.string(),
  received_time: z.string(),
  to_address: z.string(),
  cc_address: z.string().optional(),
  thread_id: z.string(),
  return_path: z.string(),
  size: z.number(),
  sender: z.string(),
  archived_message: z.number(),
  event: z.string(),
  folder_id: z.string(),
  header_message_id: z.string(),
  from_address: z.string(),
  send_time_in_gmt: z.string(),
  email: z.string()
});

type ClassificationScore = Record<string, number>;

function classifyMessage(message: z.infer<typeof mail360WebhookSchema>): {
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
  if (message.sender.toLowerCase().includes('mailer-daemon')) scores.bounce += 0.8;
  if (message.sender.toLowerCase().includes('postmaster')) scores.bounce += 0.6;
  if (message.return_path.includes('bounce')) scores.bounce += 0.5;
  
  // Subject patterns
  const subject = message.subject.toLowerCase();
  if (subject.match(/out of( the)? office/i)) scores.outOfOffice += 0.7;
  if (subject.match(/automatic reply/i)) scores.autoReply += 0.7;
  if (subject.match(/auto( |-)?reply/i)) scores.autoReply += 0.7;
  if (subject.match(/delivery (status notification|failed)/i)) scores.bounce += 0.7;
  
  // Content patterns
  const content = message.summary.toLowerCase();
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
    // Parse and validate webhook data
    const data = await request.json();
    const validationResult = mail360WebhookSchema.safeParse(data);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid webhook data', details: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const message = validationResult.data;
    
    // Find email account by Mail360 account key
    const emailAccount = await prisma.emailAccount.findFirst({
      where: { mail360AccountKey: message.account_key },
      include: { organization: true }
    });
    
    if (!emailAccount) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      );
    }
    
    // Classify message
    const { type: messageType, scores } = classifyMessage(message);
    
    // Store message in database
    const result = await prisma.emailMessage.create({
      data: {
        messageId: message.message_id,
        threadId: message.thread_id,
        organizationId: emailAccount.organizationId,
        emailAccountId: emailAccount.id,
        subject: message.subject,
        sender: message.from_address,
        recipientEmail: message.delivered_to,
        content: message.summary,
        receivedAt: new Date(parseInt(message.received_time)),
        messageType,
        classificationScores: scores
      }
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