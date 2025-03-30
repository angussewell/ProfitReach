import { NextResponse } from 'next/server';

/**
 * API route handler that proxies requests to the n8n webhook for AI suggestions
 * This solves CORS issues by handling the external API call server-side
 * This endpoint is configured as a public API that doesn't require authentication
 */
export async function POST(request: Request) {
  try {
    // Get payload from the request
    const payload = await request.json();
    
    // Log the incoming payload for debugging
    console.log('AI suggestions webhook received payload:', JSON.stringify(payload, null, 2));
    
    // Forward the request to the n8n webhook
    const response = await fetch('https://n8n.srv768302.hstgr.cloud/webhook/aisuggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    // Check if the response is ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from n8n webhook: ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json(
        { error: `Failed to process request: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Get the response data
    const data = await response.json();
    
    // Log the response for debugging
    console.log('AI suggestions webhook response:', JSON.stringify(data, null, 2));
    
    // Return the response to the client
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error in AI suggestions webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 