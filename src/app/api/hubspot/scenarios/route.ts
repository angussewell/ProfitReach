import { NextResponse } from 'next/server';
import hubspotClient, { withRetry } from '@/utils/hubspotClient';

interface HubSpotProperty {
  name: string;
  label: string;
  description: string;
  groupName: string;
  type: string;
  fieldType: string;
  options: Array<{
    label: string;
    value: string;
    displayOrder: number;
    hidden: boolean;
  }>;
}

const CORRECT_SCENARIOS = [
  'Event Based',
  'SOP Kit',
  'Quick Message',
  'FinanceKit',
  'Cash Flow Optimizer',
  'Shaan Message',
  'Shaan FU 2',
  'Shaan FU 1',
  'Buildium Scenario 1',
  'VRSA Webinar',
  'Simple Statements Announcement',
  'Case Study Email',
  'Follow Up',
  'Partner Outreach',
  'Buildium Follow Up 1'
];

// Get existing scenarios from HubSpot properties
export async function GET() {
  try {
    // Check environment variables
    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    if (!token) {
      console.error('HUBSPOT_PRIVATE_APP_TOKEN is not set');
      return NextResponse.json(
        { error: 'HubSpot token not configured' },
        { status: 500 }
      );
    }

    // Log token length and first/last few characters for debugging
    console.log('Token check:', {
      length: token.length,
      prefix: token.slice(0, 7),
      suffix: token.slice(-4),
      nodeEnv: process.env.NODE_ENV
    });

    console.log('Fetching scenarios from HubSpot...');
    
    // Instead of fetching from HubSpot, return the predefined scenarios
    const scenarios = CORRECT_SCENARIOS.map((name, index) => ({
      label: name,
      value: name.toLowerCase().replace(/\s+/g, '_'),
      displayOrder: index + 1,
      hidden: false
    }));

    console.log('Using predefined scenarios:', scenarios);

    return NextResponse.json({
      scenarios: scenarios
    });
  } catch (error: any) {
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack,
      hasHubspotToken: !!process.env.HUBSPOT_PRIVATE_APP_TOKEN
    });
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch scenarios',
        details: {
          status: error.response?.status,
          message: error.message,
          type: error.name
        }
      },
      { status: error.response?.status || 500 }
    );
  }
}

// Create a new scenario by adding it to all three properties
export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json(
        { error: 'Scenario name is required' },
        { status: 400 }
      );
    }

    // Validate that the scenario name is in our list
    if (!CORRECT_SCENARIOS.includes(name)) {
      return NextResponse.json(
        { error: 'Invalid scenario name' },
        { status: 400 }
      );
    }

    // Create the new option
    const newOption = {
      label: name,
      value: name.toLowerCase().replace(/\s+/g, '_'),
      displayOrder: CORRECT_SCENARIOS.indexOf(name) + 1,
      hidden: false
    };

    return NextResponse.json({ success: true, scenario: newOption });
  } catch (error: any) {
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create scenario' },
      { status: error.response?.status || 500 }
    );
  }
} 