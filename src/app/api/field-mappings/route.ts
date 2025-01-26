import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

// Helper to normalize field names
function normalizeFieldName(field: string): string {
  return field.toLowerCase().trim();
}

// Get all field mappings
export async function GET() {
  try {
    log('info', 'Fetching field mappings');
    const mappings = await prisma.fieldMapping.findMany({
      orderBy: { createdAt: 'asc' }
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
    
    const { name, mapping } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const normalizedName = normalizeFieldName(name);

    const fieldMapping = await prisma.fieldMapping.upsert({
      where: { name: normalizedName },
      create: { 
        name: normalizedName,
        mapping
      },
      update: { mapping }
    });

    return NextResponse.json(fieldMapping);
  } catch (error) {
    log('error', 'Failed to update field mapping', { error: String(error) });
    return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
  }
} 