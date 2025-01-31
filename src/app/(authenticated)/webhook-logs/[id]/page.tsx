import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import WebhookLogDetail from './webhook-log-detail';

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

  return <WebhookLogDetail log={log} />;
} 