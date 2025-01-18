import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeVariables, processObjectVariables } from '@/utils/variableReplacer';
import { Prompt } from '@prisma/client';

// Types for the webhook request
interface WebhookRequest {
  contactData: Record<string, string>;
  userWebhookUrl?: string;
}

export async function POST(request: Request) {
  try {
    // Log raw request details for debugging
    const rawText = await request.text();
    console.log('Raw request text:', rawText);
    
    // Try to parse the JSON
    let body: WebhookRequest;
    try {
      body = JSON.parse(rawText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { 
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : 'Unknown error',
          rawText
        },
        { status: 400 }
      );
    }

    const { contactData, userWebhookUrl } = body;
    console.log('Parsed request body:', JSON.stringify(body, null, 2));

    // Validate request body
    if (!contactData || typeof contactData !== 'object') {
      console.error('Invalid contactData:', contactData);
      return NextResponse.json(
        { 
          error: 'Invalid request: contactData must be an object',
          received: contactData
        },
        { status: 400 }
      );
    }

    // Log environment variables (without sensitive values)
    console.log('Environment check:', {
      hasHubspotToken: !!process.env.HUBSPOT_ACCESS_TOKEN,
      hasDbUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV
    });

    // Validate make_sequence field
    if (!contactData.make_sequence) {
      console.error('Missing make_sequence field:', contactData);
      return NextResponse.json(
        { 
          error: 'Missing required field: contactData.make_sequence',
          receivedFields: Object.keys(contactData)
        },
        { status: 400 }
      );
    }

    // Normalize variables from contact data
    const variables = normalizeVariables(contactData);
    console.log('Normalized variables:', variables);

    // Get the scenario from the database
    let scenario;
    try {
      scenario = await prisma.scenario.findFirst({
        where: { name: contactData.make_sequence },
        include: { signature: true }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error',
          details: dbError instanceof Error ? dbError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    if (!scenario) {
      console.error(`Scenario not found: ${contactData.make_sequence}`);
      return NextResponse.json(
        { 
          error: `Scenario not found: ${contactData.make_sequence}`,
          availableScenarios: await prisma.scenario.findMany({ select: { name: true } })
        },
        { status: 404 }
      );
    }

    console.log('Found scenario:', scenario.name);

    // Get all prompts
    let prompts: Prompt[] = [];
    try {
      prompts = await prisma.prompt.findMany();
      console.log(`Found ${prompts.length} prompts`);
    } catch (promptError) {
      console.error('Error fetching prompts:', promptError);
    }

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

        const responseText = await webhookResponse.text();
        console.log('Webhook response:', {
          status: webhookResponse.status,
          statusText: webhookResponse.statusText,
          headers: Object.fromEntries(webhookResponse.headers.entries()),
          body: responseText
        });

        if (!webhookResponse.ok) {
          return NextResponse.json(
            { 
              error: 'Failed to forward to webhook',
              details: {
                status: webhookResponse.status,
                statusText: webhookResponse.statusText,
                body: responseText
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