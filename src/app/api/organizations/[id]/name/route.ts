import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get organization ID from params
    const { id } = params;

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }

    // Find organization
    const organization = await prisma.organization.findUnique({
      where: { id },
      select: { name: true } // Only select the name field
    });

    // Handle not found
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Return just the name
    return NextResponse.json({ name: organization.name });

  } catch (error) {
    console.error('Error fetching organization name:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization name' },
      { status: 500 }
    );
  }
} 