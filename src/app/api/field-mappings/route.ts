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

// Get all field mappings
export async function GET() {
  try {
    log('info', 'Fetching field mappings');
    const mappings = await prisma.fieldMapping.findMany({
      orderBy: { systemField: 'asc' }
    });
    return NextResponse.json(mappings);
  } catch (error) {
    log('error', 'Failed to fetch field mappings', { error: String(error) });
    return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
  }
}

// Create or update a field mapping
export async function POST(request: Request) {
  try {
    const body = await request.json();
    log('info', 'Creating/updating field mapping', { body });
    
    const { systemField, webhookField } = body;
    if (!systemField?.trim() || !webhookField?.trim()) {
      return NextResponse.json({ error: 'Invalid fields' }, { status: 400 });
    }

    const mapping = await prisma.fieldMapping.upsert({
      where: { systemField },
      create: { 
        systemField,
        webhookField,
        isRequired: ['contactEmail', 'scenarioName'].includes(systemField)
      },
      update: { webhookField }
    });

    return NextResponse.json(mapping);
  } catch (error) {
    log('error', 'Failed to update field mapping', { error: String(error) });
    return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
  }
} 