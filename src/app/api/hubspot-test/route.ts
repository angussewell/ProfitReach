import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Testing HubSpot API with minimal implementation');
    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    
    if (!token?.startsWith('pat-na1-')) {
      console.error('Invalid token format:', { 
        tokenPrefix: token?.slice(0, 8),
        length: token?.length 
      });
      return NextResponse.json({ error: 'Invalid token format' }, { status: 500 });
    }

    const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('HubSpot API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorData
      });
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Test route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 