import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Get all webhook fields
    const fields = await prisma.webhookField.findMany({
      orderBy: {
        lastSeen: 'desc'
      }
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
      'make_sequence'
    ];

    // Combine and deduplicate fields
    const allFields = [...new Set([
      ...fields.map(f => f.field),
      ...commonFields
    ])];

    return NextResponse.json(allFields);
  } catch (error) {
    console.error('Failed to fetch webhook fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook fields' },
      { status: 500 }
    );
  }
} 