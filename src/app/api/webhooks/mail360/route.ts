import { NextResponse } from 'next/server';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Add GET handler for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: Request) {
  try {
    console.log('Received Mail360 webhook request');
    
    // Parse and validate webhook data
    let data;
    const rawBody = await request.text();
    
    console.log('Raw webhook body:', rawBody);
    
    try {
      // Handle both regular and pre-stringified JSON
      data = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
    } catch (parseError) {
      console.error('Failed to parse webhook data:', {
        error: parseError,
        rawBody: rawBody.slice(0, 1000) // Log first 1000 chars only
      });
      return NextResponse.json(
        { error: 'Invalid JSON data', details: parseError instanceof Error ? parseError.message : String(parseError) },
        { status: 400 }
      );
    }

    console.log('Parsed webhook data:', {
      data,
      headers: Object.fromEntries(request.headers)
    });
    
    // Just echo back the parsed data
    return NextResponse.json({
      success: true,
      received: data
    });
    
  } catch (error) {
    // Log the full error details
    console.error('Webhook error:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      type: typeof error
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 