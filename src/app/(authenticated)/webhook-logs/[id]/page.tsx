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
interface ExtendedWebhookLog extends WebhookLog {
  emailSubject?: string;
  emailHtmlBody?: string;
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

  console.log("Raw log from DB:", {
    id: log.id,
    status: log.status,
    hasEmailSubject: !!log.emailSubject,
    hasEmailHtmlBody: !!log.emailHtmlBody,
    emailSubject: log.emailSubject,
    emailHtmlBodyLength: log.emailHtmlBody?.length || 0
  });

  // Cast the log data to match the expected types
  const formattedLog = {
    ...log,
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
    emailSubject: formattedLog.emailSubject,
    emailHtmlBodyLength: formattedLog.emailHtmlBody?.length || 0
  });

  return (
    <PageContainer>
      <WebhookLogDetail log={formattedLog} />
    </PageContainer>
  );
} 