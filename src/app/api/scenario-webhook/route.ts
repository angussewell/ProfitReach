import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeVariables, processObjectVariables } from '@/utils/variableReplacer';

// Types for the webhook request
interface WebhookRequest {
  contactData: Record<string, string>;
  userWebhookUrl?: string;
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body: WebhookRequest = await request.json();
    const { contactData, userWebhookUrl } = body;

    // Log the raw request for debugging
    console.log('Raw webhook request:', JSON.stringify(body, null, 2));

    // Validate request body
    if (!contactData || typeof contactData !== 'object') {
      console.error('Invalid request body:', body);
      return NextResponse.json(
        { error: 'Invalid request: contactData must be an object' },
        { status: 400 }
      );
    }

    // Validate make_sequence field
    if (!contactData.make_sequence) {
      console.error('Missing make_sequence field:', contactData);
      return NextResponse.json(
        { error: 'Missing required field: contactData.make_sequence' },
        { status: 400 }
      );
    }

    // Normalize variables from contact data
    const variables = normalizeVariables(contactData);
    console.log('Normalized variables:', variables);

    // Get the scenario from the database
    const scenario = await prisma.scenario.findFirst({
      where: { name: contactData.make_sequence },
      include: { signature: true }
    });

    if (!scenario) {
      console.error(`Scenario not found: ${contactData.make_sequence}`);
      return NextResponse.json(
        { error: `Scenario not found: ${contactData.make_sequence}` },
        { status: 404 }
      );
    }

    console.log('Found scenario:', scenario.name);

    // Get all prompts
    const prompts = await prisma.prompt.findMany();
    console.log(`Found ${prompts.length} prompts`);

    // Process the scenario data with variable replacement
    const processedScenario = processObjectVariables(
      {
        ...scenario,
        signature: scenario.signature ? {
          ...scenario.signature,
          signatureContent: scenario.signature.signatureContent
        } : null
      },
      variables
    );

    // Process prompts with variable replacement
    const processedPrompts = prompts.map(prompt => 
      processObjectVariables(prompt, variables)
    );

    // Prepare the response payload
    const responsePayload = {
      scenario: processedScenario,
      prompts: processedPrompts,
      contactData: variables,
      meta: {
        timestamp: new Date().toISOString(),
        originalScenario: contactData.make_sequence,
        promptCount: prompts.length
      }
    };

    // If a webhook URL is provided, forward the processed data
    if (userWebhookUrl) {
      try {
        console.log('Forwarding to webhook URL:', userWebhookUrl);
        console.log('Webhook payload:', JSON.stringify(responsePayload, null, 2));
        
        const webhookResponse = await fetch(userWebhookUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'HubSpot-Webhook/1.0'
          },
          body: JSON.stringify(responsePayload)
        });

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          console.error('Error forwarding to webhook:', {
            status: webhookResponse.status,
            statusText: webhookResponse.statusText,
            body: errorText
          });
          
          return NextResponse.json(
            { 
              error: 'Failed to forward to webhook',
              details: {
                status: webhookResponse.status,
                statusText: webhookResponse.statusText,
                body: errorText
              }
            },
            { status: 500 }
          );
        }

        console.log('Successfully forwarded to webhook');
      } catch (error) {
        console.error('Error forwarding to webhook:', error);
        return NextResponse.json(
          { 
            error: 'Failed to forward to webhook',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

    // Return the processed data
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error in scenario-webhook POST:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 