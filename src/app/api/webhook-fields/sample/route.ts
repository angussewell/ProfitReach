import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helper function to extract unique fields from webhook logs
async function extractUniqueFields(): Promise<string[]> {
  const logs = await prisma.webhookLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    select: { requestBody: true }
  });

  const fields = new Set<string>();
  
  logs.forEach(log => {
    const data = log.requestBody as Record<string, any>;
    Object.keys(data).forEach(key => fields.add(key));
    
    // Also check nested contactData if it exists
    if (data.contactData && typeof data.contactData === 'object') {
      Object.keys(data.contactData).forEach(key => fields.add(key));
    }
  });

  return Array.from(fields).sort();
}

export async function GET() {
  try {
    const fields = await extractUniqueFields();
    return NextResponse.json({ fields });
  } catch (error) {
    console.error('Failed to fetch sample webhook fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sample webhook fields' },
      { status: 500 }
    );
  }
} 