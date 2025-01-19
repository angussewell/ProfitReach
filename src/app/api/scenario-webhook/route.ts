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

// Production logging helper
function logProduction(message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    data,
    environment: process.env.VERCEL_ENV || 'unknown'
  };
  console.log(JSON.stringify(logEntry));
}

export async function POST(request: Request) {
  logProduction('Webhook received', { url: request.url });
  
  try {
    // Parse request body
    const rawText = await request.text();
    logProduction('Raw webhook data', { rawText });
    
    let data: Record<string, any>;
    try {
      data = JSON.parse(rawText);
      logProduction('Parsed webhook body', data);
    } catch (parseError) {
      logProduction('JSON parse error', { error: String(parseError) });
      
      await prisma.webhookLog.create({
        data: {
          scenarioName: 'unknown',
          contactEmail: 'unknown',
          status: 'error',
          errorMessage: `JSON parse error: ${String(parseError)}`,
          requestBody: { raw: rawText },
        }
      });

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
      contactLastName,
      leadStatus,
      lifecycleStage
    ] = await Promise.all([
      getMappedValue(data, 'scenarioName'),
      getMappedValue(data, 'contactEmail'),
      getMappedValue(data, 'contactFirstName'),
      getMappedValue(data, 'contactLastName'),
      getMappedValue(data, 'leadStatus'),
      getMappedValue(data, 'lifecycleStage')
    ]);

    // Combine first and last name
    const contactName = [contactFirstName, contactLastName]
      .filter(Boolean)
      .join(' ') || undefined;

    // Verify required fields
    if (!scenarioName || !contactEmail) {
      const error = 'Missing required fields: scenario name and contact email must be mapped';
      logProduction('Validation error', { error });
      
      await prisma.webhookLog.create({
        data: {
          scenarioName: scenarioName || 'unknown',
          contactEmail: contactEmail || 'unknown',
          status: 'error',
          errorMessage: error,
          requestBody: data,
        }
      });

      return NextResponse.json({ error }, { status: 400 });
    }

    // Create webhook log
    const log = await prisma.webhookLog.create({
      data: {
        scenarioName,
        contactEmail,
        contactName,
        status: 'success',
        requestBody: {
          ...data,
          mappedFields: {
            scenarioName,
            contactEmail,
            contactFirstName,
            contactLastName,
            contactName,
            leadStatus,
            lifecycleStage
          }
        }
      }
    });

    logProduction('Webhook processed successfully', { logId: log.id });
    return NextResponse.json({ success: true, logId: log.id });
    
  } catch (error) {
    logProduction('Webhook processing failed', { error: String(error) });
    
    try {
      await prisma.webhookLog.create({
        data: {
          scenarioName: 'unknown',
          contactEmail: 'unknown',
          status: 'error',
          errorMessage: String(error),
          requestBody: { error: String(error) },
        }
      });
    } catch (logError) {
      logProduction('Failed to create error log', { error: String(logError) });
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 