import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
    // Get fields from our registry
    const fields = await prisma.webhookField.findMany({
      orderBy: { lastSeen: 'desc' }
    });
    
    return NextResponse.json({
      fields: fields.map((f: { field: string }) => f.field)
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
    
    // Extract fields from both top level and contactData
    const topLevelFields = extractFields(data);
    const contactDataFields = data.contactData ? extractFields(data.contactData, 'contactData') : [];
    const allFields = [...new Set([...topLevelFields, ...contactDataFields])];
    
    console.log('Registering fields:', allFields);
    
    // Update field registry
    const results = await Promise.all(
      allFields.map(async (field) => {
        try {
          return await prisma.webhookField.upsert({
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
          });
        } catch (error) {
          console.error(`Failed to upsert field ${field}:`, error);
          return null;
        }
      })
    );
    
    const successfulRegistrations = results.filter(Boolean).length;
    
    return NextResponse.json({ 
      success: true, 
      fieldsRegistered: successfulRegistrations,
      totalFields: allFields.length
    });
  } catch (error) {
    console.error('Failed to register webhook fields:', error);
    return NextResponse.json(
      { error: 'Failed to register webhook fields', details: String(error) },
      { status: 500 }
    );
  }
} 