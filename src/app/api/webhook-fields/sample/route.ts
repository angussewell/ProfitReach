import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to extract all possible fields from a data structure
function extractFields(data: any, prefix = ''): string[] {
  if (!data || typeof data !== 'object') return [];
  
  return Object.entries(data).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      return [fullKey, ...extractFields(value, fullKey)];
    }
    return [fullKey];
  });
}

export async function GET() {
  try {
    // Get fields from our registry
    const fields = await prisma.webhookField.findMany({
      orderBy: { lastSeen: 'desc' }
    });
    
    return NextResponse.json({
      fields: fields.map(f => f.field)
    });
  } catch (error) {
    console.error('Failed to fetch webhook fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook fields' },
      { status: 500 }
    );
  }
}

// Endpoint to register new fields
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const fields = extractFields(data);
    
    // Update field registry
    await Promise.all(
      fields.map(field =>
        prisma.webhookField.upsert({
          where: { field },
          create: { 
            field,
            lastSeen: new Date(),
            occurrences: 1
          },
          update: {
            lastSeen: new Date(),
            occurrences: { increment: 1 }
          }
        })
      )
    );
    
    return NextResponse.json({ success: true, fieldsRegistered: fields.length });
  } catch (error) {
    console.error('Failed to register webhook fields:', error);
    return NextResponse.json(
      { error: 'Failed to register webhook fields' },
      { status: 500 }
    );
  }
} 