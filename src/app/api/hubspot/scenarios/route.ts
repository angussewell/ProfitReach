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

// Get existing scenarios from HubSpot properties
export async function GET() {
  try {
    console.log('Fetching scenarios from HubSpot...');
    
    // Get all contact properties
    const response = await withRetry(async () => {
      console.log('Making request to HubSpot API...');
      const res = await hubspotClient.apiRequest({
        method: 'GET',
        path: '/properties/v1/contacts/properties'
      });
      const data = await res.json();
      return data as HubSpotProperty[];
    });

    // Ensure we have an array of properties
    const properties = Array.isArray(response) ? response : [];
    console.log('All properties:', properties.map(p => p.name));

    // Find the past_sequences property
    const pastSequencesProperty = properties.find(prop => prop.name === 'past_sequences');
    console.log('Past sequences property:', pastSequencesProperty);

    if (!pastSequencesProperty) {
      console.log('No past_sequences property found');
      return NextResponse.json({ scenarios: [] });
    }

    // Extract and return the options
    const scenarios = pastSequencesProperty.options || [];
    console.log('Extracted scenarios:', scenarios);

    return NextResponse.json({
      scenarios: scenarios
    });
  } catch (error: any) {
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scenarios' },
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

    // Get all properties first
    const allProperties = await withRetry(async () => {
      const res = await hubspotClient.apiRequest({
        method: 'GET',
        path: '/properties/v1/contacts/properties'
      });
      const data = await res.json();
      return data as HubSpotProperty[];
    });

    // Find our three properties
    const pastSequences = allProperties.find(p => p.name === 'past_sequences');
    const scenariosRespondedTo = allProperties.find(p => p.name === 'scenarios_responded_to');
    const currentlyInScenario = allProperties.find(p => p.name === 'currently_in_scenario');

    if (!pastSequences || !scenariosRespondedTo || !currentlyInScenario) {
      throw new Error('One or more required properties not found');
    }

    // Create the new option
    const newOption = {
      label: name,
      value: name.toLowerCase().replace(/\s+/g, '_'),
      displayOrder: (pastSequences.options?.length || 0) + 1,
      hidden: false
    };

    // Add the new option to all three properties
    await Promise.all([
      withRetry(async () => {
        await hubspotClient.apiRequest({
          method: 'PUT',
          path: `/properties/v1/contacts/properties/named/${pastSequences.name}`,
          body: {
            ...pastSequences,
            options: [...(pastSequences.options || []), newOption]
          }
        });
      }),
      withRetry(async () => {
        await hubspotClient.apiRequest({
          method: 'PUT',
          path: `/properties/v1/contacts/properties/named/${scenariosRespondedTo.name}`,
          body: {
            ...scenariosRespondedTo,
            options: [...(scenariosRespondedTo.options || []), newOption]
          }
        });
      }),
      withRetry(async () => {
        await hubspotClient.apiRequest({
          method: 'PUT',
          path: `/properties/v1/contacts/properties/named/${currentlyInScenario.name}`,
          body: {
            ...currentlyInScenario,
            options: [...(currentlyInScenario.options || []), newOption]
          }
        });
      })
    ]);

    return NextResponse.json({ success: true, scenario: newOption });
  } catch (error: any) {
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create scenario' },
      { status: error.response?.status || 500 }
    );
  }
} 