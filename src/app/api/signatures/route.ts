import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
  const errors: string[] = [];
  
  if (!data) {
    errors.push('No signature data provided');
    return errors;
  }

  if (!data.name) {
    errors.push('Signature name is required');
  } else if (typeof data.name !== 'string') {
    errors.push('Signature name must be a string');
  } else if (!data.name.trim()) {
    errors.push('Signature name cannot be empty');
  }
  
  if (!data.content) {
    errors.push('Signature content is required');
  } else if (typeof data.content !== 'string') {
    errors.push('Signature content must be a string');
  } else if (!data.content.trim()) {
    errors.push('Signature content cannot be empty');
  }
  
  return errors;
}

// Get all signatures
export async function GET() {
  try {
    logMessage('info', 'Fetching signatures');
    const signatures = await prisma.signature.findMany({
      orderBy: { name: 'asc' }
    });
    logMessage('info', 'Signatures fetched successfully', { count: signatures.length });
    return NextResponse.json(signatures);
  } catch (error) {
    logMessage('error', 'Failed to fetch signatures', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch signatures', details: String(error) },
      { status: 500 }
    );
  }
}

// Create or update signature
export async function POST(request: Request) {
  try {
    const data = await request.json();
    logMessage('info', 'Processing signature request', { data });

    const errors = validateSignature(data);
    if (errors.length > 0) {
      logMessage('error', 'Signature validation failed', { errors });
      return NextResponse.json({ 
        error: 'Validation failed',
        details: errors 
      }, { status: 400 });
    }

    const signatureData = {
      name: data.name.trim(),
      content: data.content.trim()
    };

    const signature = await prisma.signature.upsert({
      where: { 
        id: data.id || 'new'
      },
      create: signatureData,
      update: signatureData
    });

    logMessage('info', `Signature ${data.id ? 'updated' : 'created'} successfully`, { id: signature.id });
    return NextResponse.json(signature);
  } catch (error) {
    logMessage('error', 'Failed to process signature', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to process signature', details: String(error) },
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
      logMessage('error', 'Missing signature ID');
      return NextResponse.json(
        { error: 'Signature ID is required' },
        { status: 400 }
      );
    }

    logMessage('info', 'Deleting signature', { id });
    await prisma.signature.delete({
      where: { id }
    });

    logMessage('info', 'Signature deleted successfully', { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logMessage('error', 'Failed to delete signature', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete signature', details: String(error) },
      { status: 500 }
    );
  }
} 