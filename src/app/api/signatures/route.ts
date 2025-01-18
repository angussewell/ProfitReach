import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Get all signatures
export async function GET() {
  try {
    console.log('Fetching all signatures...');
    const signatures = await prisma.signature.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log('Found signatures:', signatures.length);
    return NextResponse.json(signatures);
  } catch (error: any) {
    console.error('Error fetching signatures:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch signatures' },
      { status: 500 }
    );
  }
}

// Create a new signature
export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Creating new signature:', data);
    const signature = await prisma.signature.create({
      data: {
        signatureName: data.signatureName,
        signatureContent: data.signatureContent,
      },
    });
    console.log('Created signature:', signature);
    return NextResponse.json(signature);
  } catch (error: any) {
    console.error('Error creating signature:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create signature' },
      { status: 500 }
    );
  }
}

// Update a signature
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, signatureName, signatureContent } = data;

    if (!id) {
      return NextResponse.json({ error: 'Missing signature ID' }, { status: 400 });
    }

    const signature = await prisma.signature.update({
      where: { id },
      data: {
        signatureName,
        signatureContent,
      },
    });

    return NextResponse.json(signature);
  } catch (error: any) {
    console.error('Error updating signature:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update signature' },
      { status: 500 }
    );
  }
}

// Delete a signature
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Signature ID is required' },
        { status: 400 }
      );
    }

    await prisma.signature.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting signature:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete signature' },
      { status: 500 }
    );
  }
} 