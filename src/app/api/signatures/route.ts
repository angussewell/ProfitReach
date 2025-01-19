import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Production logging helper
function logMessage(level: 'error' | 'info', message: string, data?: any) {
  console[level](JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.VERCEL_ENV || 'development',
    ...data
  }));
}

// Validate signature data
function validateSignature(data: any) {
  const errors = [];
  
  if (!data.signatureName?.trim()) {
    errors.push('Signature name is required');
  }
  
  if (!data.signatureContent?.trim()) {
    errors.push('Signature content is required');
  }
  
  return errors;
}

// Get all signatures
export async function GET() {
  try {
    const signatures = await prisma.signature.findMany({
      orderBy: { signatureName: 'asc' }
    });
    return NextResponse.json(signatures);
  } catch (error) {
    logMessage('error', 'Failed to fetch signatures', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch signatures' },
      { status: 500 }
    );
  }
}

// Create a new signature
export async function POST(request: Request) {
  try {
    const data = await request.json();
    logMessage('info', 'Creating signature', { data });

    // Validate request
    const errors = validateSignature(data);
    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: errors 
      }, { status: 400 });
    }

    // Create signature
    const signature = await prisma.signature.create({
      data: {
        signatureName: data.signatureName.trim(),
        signatureContent: data.signatureContent.trim()
      }
    });

    return NextResponse.json(signature);
  } catch (error) {
    logMessage('error', 'Failed to create signature', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to create signature' },
      { status: 500 }
    );
  }
}

// Update a signature
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    logMessage('info', 'Updating signature', { data });

    if (!data.id) {
      return NextResponse.json(
        { error: 'Signature ID is required' },
        { status: 400 }
      );
    }

    // Validate request
    const errors = validateSignature(data);
    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: errors 
      }, { status: 400 });
    }

    // Update signature
    const signature = await prisma.signature.update({
      where: { id: data.id },
      data: {
        signatureName: data.signatureName.trim(),
        signatureContent: data.signatureContent.trim()
      }
    });

    return NextResponse.json(signature);
  } catch (error) {
    logMessage('error', 'Failed to update signature', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to update signature' },
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
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logMessage('error', 'Failed to delete signature', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete signature' },
      { status: 500 }
    );
  }
} 