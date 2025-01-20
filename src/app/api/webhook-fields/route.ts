import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Production-ready logging
function log(level: 'error' | 'info', message: string, data?: any) {
  console[level](JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.VERCEL_ENV || 'development',
    ...data
  }));
}

export async function GET() {
  try {
    log('info', 'Fetching webhook fields');
    
    // Get fields from our registry
    const fields = await prisma.webhookField.findMany({
      orderBy: { lastSeen: 'desc' }
    });

    // Add common fields that might not be mapped
    const commonFields = [
      'lifecycle_stage',
      'lead_status',
      'company',
      'PMS',
      'first_name',
      'last_name',
      'email',
      'make_sequence',
      'contactData.email',
      'contactData.first_name',
      'contactData.last_name',
      'contactData.company',
      'contactData.PMS',
      'contactData.make_sequence',
      'contactData.lifecycle_stage',
      'contactData.lead_status'
    ];

    // Combine and deduplicate fields
    const allFields = [...new Set([
      ...fields.map(f => f.field),
      ...commonFields
    ])].sort();

    log('info', 'Webhook fields fetched', { count: allFields.length });
    return NextResponse.json(allFields);
  } catch (error) {
    log('error', 'Failed to fetch webhook fields', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch webhook fields' },
      { status: 500 }
    );
  }
} 