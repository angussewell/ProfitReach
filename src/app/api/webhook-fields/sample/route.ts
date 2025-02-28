import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerWebhookFields } from '@/lib/webhook-fields';

// Helper to extract all possible fields from a data structure
function extractFields(data: any, prefix = ''): string[] {
  if (!data || typeof data !== 'object') return [];
  
  return Object.entries(data).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    // Handle different value types
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        // For arrays, include the array field itself
        return [fullKey];
      } else {
        // For objects, recurse into nested fields
        return [fullKey, ...extractFields(value, fullKey)];
      }
    }
    return [fullKey];
  });
}

export async function GET() {
  try {
    const fields = await prisma.webhookField.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({
      fields: fields.map(f => f.name)
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
    const result = await registerWebhookFields(data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to register webhook fields:', error);
    return NextResponse.json(
      { error: 'Failed to register webhook fields', details: String(error) },
      { status: 500 }
    );
  }
} 