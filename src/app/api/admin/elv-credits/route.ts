import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // Assuming authOptions are defined here

// Define the expected structure of the EmailListVerify API response
interface ElvCreditsResponse {
  status: string;
  onDemand?: {
    available?: number;
    // other onDemand fields...
  };
  daily?: {
    available?: number;
    total?: number;
    // other daily fields...
  };
  refreshIn?: string; // e.g., "10 hours 3 minutes"
  // other top-level fields...
}

// Define the structure of our API response
interface ElvCreditsWidgetData {
  onDemandAvailable: number | null;
  dailyAvailable: number | null;
  dailyTotal: number | null;
  refreshIn: string | null;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  // 1. Authentication & Authorization Check
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const apiKey = process.env.EMAIL_LIST_VERIFY_API_KEY;

  // 2. Check if API Key is configured
  if (!apiKey) {
    console.error('EMAIL_LIST_VERIFY_API_KEY is not set in environment variables.');
    return NextResponse.json({ error: 'Server configuration error: Missing API key.' }, { status: 500 });
  }

  const elvApiUrl = 'https://api.emaillistverify.com/api/credits';

  try {
    // 3. Fetch data from EmailListVerify API
    const response = await fetch(elvApiUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json', // Ensure we request JSON
      },
      // Add cache control if needed, e.g., 'no-cache' to always fetch fresh data
      cache: 'no-store', 
    });

    // 4. Handle non-OK responses from ELV API
    if (!response.ok) {
      let errorBody = 'Unknown error';
      try {
        // Try to parse error details if ELV provides them
        const errorJson = await response.json();
        errorBody = errorJson?.message || JSON.stringify(errorJson);
      } catch (parseError) {
        // Fallback if error response is not JSON
        errorBody = await response.text();
      }
      console.error(`EmailListVerify API error: ${response.status} - ${errorBody}`);
      return NextResponse.json({ error: `Failed to fetch credits from EmailListVerify: ${response.status} - ${errorBody}` }, { status: response.status });
    }

    // 5. Parse the successful JSON response
    const data: ElvCreditsResponse = await response.json();

    // 6. Extract and format the required data
    const responseData: ElvCreditsWidgetData = {
      onDemandAvailable: data.onDemand?.available ?? null,
      dailyAvailable: data.daily?.available ?? null,
      dailyTotal: data.daily?.total ?? null,
      refreshIn: data.refreshIn ?? null,
    };

    // 7. Return the formatted data
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching EmailListVerify credits:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
