import { NextResponse } from 'next/server';

/**
 * API route handler that proxies requests to the n8n webhook for AI suggestions
 * This solves CORS issues by handling the external API call server-side
 */
export async function POST(request: Request) {
  try {
    // Get payload from the request
    const payload = await request.json();
    
    // Log the content to verify line breaks are preserved (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('API route received content:', payload[0]?.content);
    }
    
    // Stringify the payload - this will properly escape line breaks
    const stringifiedPayload = JSON.stringify(payload);
    
    // Forward the request to the n8n webhook
    const response = await fetch('https://n8n.srv768302.hstgr.cloud/webhook/aisuggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: stringifiedPayload, // Use the stringified payload directly
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return the response to the client
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error forwarding request to AI suggestions webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 