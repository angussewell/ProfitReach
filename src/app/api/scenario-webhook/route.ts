import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { registerWebhookFields } from '@/lib/webhook-fields';
import { evaluateFilters } from '@/lib/filter-utils';
import { Filter } from '@/types/filters';
import { Prisma } from '@prisma/client';

// Helper function to get mapped field value
async function getMappedValue(
  data: Record<string, any>, 
  systemField: string,
  fallback?: string
): Promise<string | undefined> {
  try {
    // Get mapping for this field
    const mapping = await prisma.fieldMapping.findUnique({
      where: { systemField }
    });

    if (!mapping) {
      // Special handling for known fields
      if (systemField === 'scenarioName' && data.contactData?.make_sequence) {
        return data.contactData.make_sequence;
      }
      
      logMessage('info', 'No mapping found for field', { systemField });
      return fallback;
    }

    // Extract value using webhook field path
    const webhookField = mapping.webhookField;
    
    // Try different field formats
    const value = 
      // Direct field access
      data[webhookField] ||
      data.contactData?.[webhookField] ||
      // Template format
      data.contactData?.[`{${webhookField}}`] ||
      // Remove template brackets if present
      data.contactData?.[webhookField.replace(/[{}]/g, '')] ||
      // Try as a nested path
      webhookField.split('.').reduce((obj, key) => obj?.[key], data);

    if (value === undefined || value === null) {
      logMessage('info', 'No value found for mapped field', { systemField, webhookField });
      return fallback;
    }

    return String(value);
  } catch (error) {
    logMessage('error', 'Error getting mapped value', { 
      systemField, 
      error: String(error)
    });
    return fallback;
  }
}

// Forward webhook to specified URL with enriched data
async function forwardWebhook(url: string, originalData: any, enrichedData: any) {
  try {
    // Deep clone to prevent mutation
    const forwardData = {
      // Original webhook data preserved exactly as received
      original: JSON.parse(JSON.stringify(originalData)),
      // Enriched data with full context
      enriched: {
        ...enrichedData,
        meta: {
          timestamp: new Date().toISOString(),
          environment: process.env.VERCEL_ENV || 'development',
          version: '2.0'
        }
      }
    };

    logMessage('info', 'Preparing to forward data', { 
      dataSize: JSON.stringify(forwardData).length,
      hasOriginal: !!forwardData.original,
      hasEnriched: !!forwardData.enriched,
      url 
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwardData)
    });
    
    const responseText = await response.text();
    logMessage('info', 'Webhook forwarded', {
      status: response.status,
      ok: response.ok,
      responseSize: responseText.length
    });
    
    return { 
      ok: response.ok,
      status: response.status,
      body: responseText
    };
  } catch (error) {
    logMessage('error', 'Failed to forward webhook', { error: String(error) });
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
  try {
    const body = await request.json();
    const { contactData, userWebhookUrl } = body;

    // Get the scenario based on the make_sequence field
    const scenario = await prisma.scenario.findFirst({
      where: {
        name: contactData.make_sequence
      }
    });

    if (!scenario) {
      await prisma.webhookLog.create({
        data: {
          status: 'error',
          requestBody: body,
          responseBody: { error: 'Scenario not found' },
          scenarioName: contactData.make_sequence,
          contactEmail: contactData.email,
          contactName: `${contactData.first_name} ${contactData.last_name}`.trim()
        }
      });
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    // Evaluate filters if they exist
    let filters: Filter[] = [];
    try {
      const filtersJson = scenario.filters as Prisma.JsonValue;
      filters = filtersJson ? JSON.parse(String(filtersJson)) as Filter[] : [];
    } catch (e) {
      console.error('Failed to parse webhook filters:', e);
      // Continue with empty filters array
    }

    const filterResult = evaluateFilters(filters, contactData);

    if (!filterResult.passed) {
      // Create a blocked webhook log
      await prisma.webhookLog.create({
        data: {
          status: 'blocked',
          requestBody: body,
          responseBody: { reason: filterResult.reason },
          scenarioName: scenario.name,
          contactEmail: contactData.email,
          contactName: `${contactData.first_name} ${contactData.last_name}`.trim()
        }
      });
      return NextResponse.json({ status: 'blocked', reason: filterResult.reason }, { status: 200 });
    }

    // Forward the webhook if filters pass
    const response = await fetch(userWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json();

    // Log the successful webhook
    await prisma.webhookLog.create({
      data: {
        status: 'success',
        requestBody: body,
        responseBody: responseData,
        scenarioName: scenario.name,
        contactEmail: contactData.email,
        contactName: `${contactData.first_name} ${contactData.last_name}`.trim()
      }
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Webhook processing error:', error);

    // Log the error
    await prisma.webhookLog.create({
      data: {
        status: 'error',
        requestBody: { error: error.message },
        responseBody: { error: error.message },
        scenarioName: 'Unknown',
        contactEmail: 'Unknown',
        contactName: 'Unknown'
      }
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 