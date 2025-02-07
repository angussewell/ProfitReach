import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import WebhookLogDetail from './webhook-log-detail';
import { PageContainer } from '@/components/layout/PageContainer';
import { Prisma } from '@prisma/client';

interface Props {
  params: {
    id: string;
  };
}

export default async function WebhookLogPage({ params }: Props) {
  const log = await prisma.webhookLog.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!log) {
    notFound();
  }

  // Cast the log data to match the expected types
  const formattedLog = {
    ...log,
    requestBody: log.requestBody as Record<string, any>,
    responseBody: typeof log.responseBody === 'string' 
      ? log.responseBody 
      : JSON.stringify(log.responseBody)
  };

  return (
    <PageContainer>
      <WebhookLogDetail log={formattedLog} />
    </PageContainer>
  );
} 