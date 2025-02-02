import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

// Production-ready logging
function log(level: 'error' | 'info', message: string, data?: any) {
  console[level](JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.VERCEL_ENV || 'development',
    ...data
  }));
}

export const dynamic = 'force-dynamic'; // Disable static optimization

export async function GET() {
  try {
    log('info', 'Fetching webhook fields');
    
    // Get fields from our registry
    const fields = await prisma.webhookField.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    // Return only fields from the database
    const allFields = fields.map(f => f.name).sort();

    log('info', 'Webhook fields fetched', { count: allFields.length, fields: allFields });

    // Set cache control headers
    const response = NextResponse.json(allFields);
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    return response;
  } catch (error) {
    log('error', 'Failed to fetch webhook fields', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch webhook fields' },
      { status: 500 }
    );
  }
} 