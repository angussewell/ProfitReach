import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

interface ContactData {
  company?: string;
  firstname?: string;
  make_sequence: string;
  [key: string]: string | undefined;
}

interface WebhookRequest {
  contactData: ContactData;
  userWebhookUrl: string;
}

type ScenarioWithSignature = Prisma.ScenarioGetPayload<{
  include: { signature: true }
}>;

export async function POST(request: Request) {
  try {
    const body = await request.json() as WebhookRequest;
    const { contactData, userWebhookUrl } = body;

    if (!contactData.make_sequence) {
      return NextResponse.json(
        { error: 'make_sequence is required in contactData' },
        { status: 400 }
      );
    }

    // 1. Find the scenario by name
    const scenario = await prisma.scenario.findFirst({
      where: { name: contactData.make_sequence },
      include: {
        signature: true // Include the related signature
      }
    });

    if (!scenario) {
      return NextResponse.json(
        { error: `Scenario '${contactData.make_sequence}' not found` },
        { status: 404 }
      );
    }

    // 2. Get all prompts
    const prompts = await (prisma as any).prompt.findMany() as Array<{
      name: string;
      content: string;
    }>;

    // 3. Build the response payload
    const result = {
      scenario: {
        name: scenario.name,
        scenarioType: scenario.scenarioType,
        subjectLine: scenario.subjectLine,
        customizationPrompt: scenario.customizationPrompt,
        emailExamplesPrompt: scenario.emailExamplesPrompt,
        signature: scenario.signature ? {
          name: scenario.signature.signatureName,
          content: scenario.signature.signatureContent
        } : null
      },
      prompts: prompts.map(({ name, content }) => ({
        name,
        content
      })),
      contactData
    };

    // 4. Forward to the user's webhook if provided
    if (userWebhookUrl) {
      const webhookResponse = await fetch(userWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      });

      if (!webhookResponse.ok) {
        console.error('Failed to forward to webhook:', await webhookResponse.text());
        return NextResponse.json(
          { error: 'Failed to forward to webhook' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 