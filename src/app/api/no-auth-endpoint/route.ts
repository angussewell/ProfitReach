import { NextResponse } from 'next/server';

/**
 * COMPLETELY UNSECURED ENDPOINT - NO AUTHENTICATION REQUIRED
 * This endpoint proxies requests to the n8n webhook
 */
export async function POST(request: Request) {
  try {
    // Get payload from the request
    const payload = await request.json();
    
    // Log the incoming payload for debugging
    console.log('Unsecured endpoint received payload:', JSON.stringify(payload, null, 2));
    
    // Forward the request to the n8n webhook
    const response = await fetch('https://n8n-n8n.swl3bc.easypanel.host/webhook/aisuggestions', {
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
    console.log('Unsecured endpoint received response:', JSON.stringify(data, null, 2));
    
    // Return the response to the client
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error in unsecured endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
