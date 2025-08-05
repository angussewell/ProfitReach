import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import WebhookLogDetail from './webhook-log-detail';
import { PageContainer } from '@/components/layout/PageContainer';
import { Prisma, WebhookLog } from '@prisma/client';

interface Props {
  params: {
    id: string;
  };
}

// Define an extended type that includes our new fields
interface ExtendedWebhookLog extends Omit<WebhookLog, 'emailSubject' | 'emailHtmlBody'> {
  emailSubject?: string | null;
  emailHtmlBody?: string | null;
}

export default async function WebhookLogPage({ params }: Props) {
  console.log("Fetching webhook log with ID:", params.id);
  
  const log = await prisma.webhookLog.findUnique({
    where: {
      id: params.id,
    },
  }) as ExtendedWebhookLog; // Cast to our extended type

  if (!log) {
    console.log("Webhook log not found for ID:", params.id);
    notFound();
  }

  // Try to find the actual email subject from MailReef messages
  let actualEmailSubject = log.emailSubject;
  
  if (log.contactEmail && log.organizationId) {
    try {
      // First, get the scenario ID for this webhook log
      const scenario = await prisma.scenario.findFirst({
        where: {
          name: log.scenarioName,
          organizationId: log.organizationId
        },
        select: { id: true }
      });

      if (scenario) {
        // First, try to find a MailReef message sent to this specific contact for this scenario
        const exactMatch = await prisma.$queryRaw<Array<{subject: string}>>`
          SELECT mr.subject 
          FROM "MailReefMessage" mr
          JOIN "MailReefRecipient" mrr ON mr.id = mrr."mailReefMessageId"
          WHERE mr."scenarioId" = ${scenario.id}
            AND mr."organizationId" = ${log.organizationId}
            AND mrr."recipientEmail" = ${log.contactEmail}
            AND mr.direction = 'outbound'
          ORDER BY mr."eventTimestamp" DESC
          LIMIT 1
        `;

        if (exactMatch.length > 0) {
          actualEmailSubject = exactMatch[0].subject;
          console.log("Found exact email subject match from MailReef:", actualEmailSubject);
        } else {
          // Fallback: Get the most recent email subject from this scenario
          // This gives us a representative actual subject line instead of the AI prompt
          const fallbackMatch = await prisma.$queryRaw<Array<{subject: string}>>`
            SELECT mr.subject 
            FROM "MailReefMessage" mr
            WHERE mr."scenarioId" = ${scenario.id}
              AND mr."organizationId" = ${log.organizationId}
              AND mr.direction = 'outbound'
              AND mr.subject IS NOT NULL
              AND mr.subject != ''
            ORDER BY mr."eventTimestamp" DESC
            LIMIT 1
          `;

          if (fallbackMatch.length > 0) {
            actualEmailSubject = fallbackMatch[0].subject;
            console.log("Found fallback email subject from MailReef scenario:", actualEmailSubject);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching MailReef subject:", error);
      // Continue with original subject if there's an error
    }
  }

  console.log("Raw log from DB:", {
    id: log.id,
    status: log.status,
    hasEmailSubject: !!log.emailSubject,
    hasEmailHtmlBody: !!log.emailHtmlBody,
    originalEmailSubject: log.emailSubject,
    actualEmailSubject: actualEmailSubject,
    emailHtmlBodyLength: log.emailHtmlBody?.length || 0
  });

  // Cast the log data to match the expected types
  const formattedLog = {
    ...log,
    emailSubject: actualEmailSubject, // Use the actual subject from MailReef if found
    createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
    requestBody: log.requestBody as Record<string, any>,
    responseBody: typeof log.responseBody === 'string' 
      ? log.responseBody 
      : JSON.stringify(log.responseBody)
  };

  console.log("Formatted log:", {
    id: formattedLog.id,
    status: formattedLog.status,
    hasEmailSubject: !!formattedLog.emailSubject,
    hasEmailHtmlBody: !!formattedLog.emailHtmlBody,
    finalEmailSubject: formattedLog.emailSubject,
    emailHtmlBodyLength: formattedLog.emailHtmlBody?.length || 0
  });

  return (
    <PageContainer>
      <WebhookLogDetail log={formattedLog} />
    </PageContainer>
  );
} 