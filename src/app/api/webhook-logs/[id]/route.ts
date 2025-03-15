import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { formatDateInCentralTime } from '@/lib/date-utils';
import { WebhookLog } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Helper function to parse JSON safely
function safeJsonParse(value: any): any {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

// Type for our formatted response
interface FormattedWebhookLog extends Omit<WebhookLog, 'createdAt'> {
  createdAt: string;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const log = await prisma.webhookLog.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    if (log.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Format log for frontend display
    const formattedLog: FormattedWebhookLog = {
      ...log,
      createdAt: formatDateInCentralTime(log.createdAt.toISOString()),
      requestBody: safeJsonParse(log.requestBody),
      responseBody: safeJsonParse(log.responseBody)
    };

    return NextResponse.json(formattedLog);
  } catch (error) {
    console.error('Error fetching webhook log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook log' },
      { status: 500 }
    );
  }
}
