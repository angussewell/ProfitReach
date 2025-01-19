import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Get all field mappings
export async function GET() {
  try {
    const mappings = await prisma.fieldMapping.findMany();
    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Failed to fetch field mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch field mappings' },
      { status: 500 }
    );
  }
}

// Create or update a field mapping
export async function POST(request: Request) {
  try {
    const { systemField, webhookField } = await request.json();

    if (!systemField || !webhookField) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const mapping = await prisma.fieldMapping.upsert({
      where: { systemField },
      create: {
        systemField,
        webhookField,
        isRequired: systemField === 'contactEmail' || systemField === 'scenarioName'
      },
      update: { webhookField }
    });

    return NextResponse.json(mapping);
  } catch (error) {
    console.error('Failed to update field mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update field mapping' },
      { status: 500 }
    );
  }
} 