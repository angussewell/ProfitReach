import { NextResponse } from 'next/server';

// Simple test endpoint to verify API routes are working
export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  console.log(`🔴 TEST ENDPOINT CALLED at ${timestamp}`);
  console.log(`🔴 Request URL: ${request.url}`);
  
  // Return timestamp to verify response
  return NextResponse.json({ 
    success: true, 
    message: 'Test endpoint working correctly',
    timestamp,
    endpoint: 'admin/test'
  });
}

// Also handle POST to match the tasks endpoint
export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  console.log(`🔴 TEST ENDPOINT POST CALLED at ${timestamp}`);
  console.log(`🔴 Request URL: ${request.url}`);
  
  try {
    const body = await request.json();
    console.log(`🔴 Request body:`, JSON.stringify(body));
  } catch (e) {
    console.log(`🔴 No JSON body or error parsing body`);
  }
  
  // Return timestamp to verify response
  return NextResponse.json({ 
    success: true, 
    message: 'Test endpoint (POST) working correctly',
    timestamp,
    endpoint: 'admin/test'
  });
} 