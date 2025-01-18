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

    // Validate required fields
    if (!contactData || !contactData.make_sequence) {
      return NextResponse.json(
        { error: 'Missing required fields: contactData.make_sequence' },
        { status: 400 }
      );
    }

    // Get the scenario from the database
    const scenario = await prisma.scenario.findFirst({
      where: { name: contactData.make_sequence },
      include: { signature: true }
    });

    if (!scenario) {
      return NextResponse.json(
        { error: `Scenario not found: ${contactData.make_sequence}` },
        { status: 404 }
      );
    }

    // Get all prompts
    const prompts = await prisma.prompt.findMany();

    // Normalize variables from contact data
    const variables = normalizeVariables(contactData);

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
      contactData: variables
    };

    // If a webhook URL is provided, forward the processed data
    if (userWebhookUrl) {
      try {
        const webhookResponse = await fetch(userWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(responsePayload)
        });

        if (!webhookResponse.ok) {
          console.error('Error forwarding to webhook:', await webhookResponse.text());
          return NextResponse.json(
            { error: 'Failed to forward to webhook' },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error('Error forwarding to webhook:', error);
        return NextResponse.json(
          { error: 'Failed to forward to webhook' },
          { status: 500 }
        );
      }
    }

    // Return the processed data
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error in scenario-webhook POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 