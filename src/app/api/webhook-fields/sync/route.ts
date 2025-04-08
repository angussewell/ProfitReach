import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/utils';

// Mark route as dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

// Standard GHL fields that should always be available
const standardFields = [
  'lifecycle_stage',
  'lead_status',
  'company',
  'PMS',
  'first_name',
  'last_name',
  'email',
  'make_sequence',
  'phone',
  'address',
  'city',
  'state',
  'zip',
  'country',
  'tags',
  'source',
  'contact_id'
];

// Normalize field names consistently
const normalizeFieldName = (field: string) => field.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function POST(req: Request) {
  try {
    const { mode, customFields } = await req.json();
    
    if (mode === 'standard') {
      // Sync standard fields
      await Promise.all(standardFields.map(field => 
        prisma.webhookField.upsert({
          where: {
            name: normalizeFieldName(field)
          },
          update: {
            originalName: field
          },
          create: {
            name: normalizeFieldName(field),
            originalName: field,
            description: `Standard field: ${field}`,
            required: false,
            type: 'string'
          }
        })
      ));
      
      log('info', 'Synced standard fields', { count: standardFields.length });
      return NextResponse.json({ success: true, count: standardFields.length });
    }
    
    if (mode === 'custom' && customFields) {
      // Sync custom fields
      const fields = Object.keys(customFields);
      await Promise.all(fields.map(field => 
        prisma.webhookField.upsert({
          where: {
            name: normalizeFieldName(field)
          },
          update: {
            originalName: field
          },
          create: {
            name: normalizeFieldName(field),
            originalName: field,
            description: `Custom field from sync`,
            required: false,
            type: 'string'
          }
        })
      ));
      
      log('info', 'Synced custom fields', { count: fields.length });
      return NextResponse.json({ success: true, count: fields.length });
    }
    
    return NextResponse.json(
      { error: 'Invalid sync mode or missing custom fields' },
      { status: 400 }
    );
    
  } catch (error) {
    log('error', 'Field sync failed', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to sync fields' },
      { status: 500 }
    );
  }
}
