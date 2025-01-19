import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helper function to get mapped field value
async function getMappedValue(data: Record<string, any>, systemField: string): Promise<string | undefined> {
  const mapping = await prisma.fieldMapping.findUnique({
    where: { systemField }
  });

  if (!mapping) {
    return undefined;
  }

  // Handle template format (e.g., {email})
  const field = mapping.webhookField;
  
  // If it's a direct field in data
  if (data[field]) {
    return data[field];
  }
  
  // If it's in contactData
  if (data.contactData?.[field]) {
    return data.contactData[field];
  }
  
  // If it's a template field in contactData
  if (field.startsWith('{') && field.endsWith('}')) {
    const templateField = field.slice(1, -1); // Remove { }
    return data.contactData?.[templateField] || data.contactData?.[field];
  }

  return undefined;
}

// Forward webhook to specified URL
async function forwardWebhook(url: string, data: any) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return { 
      ok: response.ok,
      status: response.status,
      body: await response.text()
    };
  } catch (error) {
    return { 
      ok: false, 
      error: String(error)
    };
  }
}

// Production logging helper
function logMessage(level: 'error' | 'info', message: string, data?: any) {
  console[level](JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.VERCEL_ENV || 'development',
    ...data
  }));
}

export async function POST(request: Request) {
  logMessage('info', 'Webhook received', { url: request.url });
  
  try {
    // Parse request body
    const rawText = await request.text();
    let data: Record<string, any>;
    try {
      data = JSON.parse(rawText);
      logMessage('info', 'Parsed webhook data', data);
    } catch (parseError) {
      logMessage('error', 'JSON parse error', { error: String(parseError) });
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Get mapped values
    const [
      scenarioName,
      contactEmail,
      contactFirstName,
      contactLastName
    ] = await Promise.all([
      getMappedValue(data, 'scenarioName'),
      getMappedValue(data, 'contactEmail'),
      getMappedValue(data, 'contactFirstName'),
      getMappedValue(data, 'contactLastName')
    ]);

    // Verify required fields
    if (!scenarioName || !contactEmail) {
      const error = 'Missing required fields: scenario name and contact email must be mapped';
      logMessage('error', 'Validation error', { error });
      return NextResponse.json({ error }, { status: 400 });
    }

    // Get scenario details
    const scenario = await prisma.scenario.findUnique({
      where: { name: scenarioName },
      include: { signature: true }
    });

    if (!scenario) {
      logMessage('error', 'Scenario not found', { scenarioName });
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Prepare data for forwarding
    const forwardData = {
      contactEmail,
      contactName: [contactFirstName, contactLastName].filter(Boolean).join(' '),
      scenarioType: scenario.scenarioType,
      subjectLine: scenario.subjectLine,
      signature: scenario.signature?.signatureContent,
      customizationPrompt: scenario.customizationPrompt,
      emailExamplesPrompt: scenario.emailExamplesPrompt
    };

    // Forward to webhook URL if provided
    let forwardResult;
    if (data.userWebhookUrl) {
      forwardResult = await forwardWebhook(data.userWebhookUrl, forwardData);
      logMessage('info', 'Webhook forwarded', { 
        url: data.userWebhookUrl,
        success: forwardResult.ok
      });
    }

    // Create webhook log
    const log = await prisma.webhookLog.create({
      data: {
        scenarioName,
        contactEmail,
        contactName: forwardData.contactName,
        status: forwardResult?.ok ? 'success' : 'error',
        errorMessage: forwardResult?.error,
        requestBody: data,
        responseBody: forwardResult
      }
    });

    return NextResponse.json({ 
      success: true, 
      logId: log.id,
      forwarded: !!forwardResult,
      forwardSuccess: forwardResult?.ok
    });
    
  } catch (error) {
    logMessage('error', 'Webhook processing failed', { error: String(error) });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 