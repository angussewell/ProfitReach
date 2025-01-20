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

function getContactInfo(data: any) {
  const contactData = data.contactData || {};
  
  return {
    email: contactData.email || contactData['{email}'] || 'Unknown',
    name: [
      contactData.first_name || contactData['{first_name}'],
      contactData.last_name || contactData['{last_name}']
    ].filter(Boolean).join(' ') || 'Unknown',
    company: contactData.company || contactData.company_name || contactData.PMS || 'Unknown'
  };
}

export async function POST(request: Request) {
  let requestBody;
  try {
    requestBody = await request.json();
    const { contactData, userWebhookUrl } = requestBody;

    // Validate required fields
    if (!contactData) {
      throw new Error('Missing contactData in request body');
    }
    if (!userWebhookUrl) {
      throw new Error('Missing userWebhookUrl in request body');
    }
    if (!contactData.make_sequence) {
      throw new Error('Missing make_sequence field in contactData');
    }

    // Get contact info early
    const { email, name, company } = getContactInfo(requestBody);

    logMessage('info', 'Processing webhook request', {
      sequence: contactData.make_sequence,
      contact: email,
      company
    });

    // Get the scenario with all necessary data
    const scenario = await prisma.scenario.findFirst({
      where: {
        name: contactData.make_sequence
      },
      include: {
        signature: true
      }
    });

    if (!scenario) {
      const error = `Scenario not found: ${contactData.make_sequence}`;
      logMessage('error', error, { contactData });
      
      await prisma.webhookLog.create({
        data: {
          status: 'error',
          requestBody: requestBody,
          responseBody: { error },
          scenarioName: contactData.make_sequence || 'Unknown',
          contactEmail: email,
          contactName: name,
          company: company
        }
      });
      
      return NextResponse.json({ 
        status: 'error',
        error,
        request: {
          sequence: contactData.make_sequence,
          contact: email,
          company
        }
      }, { status: 404 });
    }

    // Parse and evaluate filters
    let filters: Filter[] = [];
    try {
      const filtersJson = scenario.filters as Prisma.JsonValue;
      filters = filtersJson ? JSON.parse(String(filtersJson)) as Filter[] : [];
      
      logMessage('info', 'Evaluating filters', { 
        filterCount: filters.length,
        scenarioName: scenario.name 
      });
    } catch (e) {
      logMessage('error', 'Failed to parse filters', { error: e });
      filters = []; // Continue with empty filters
    }

    const filterResult = evaluateFilters(filters, requestBody);

    if (!filterResult.passed) {
      logMessage('info', 'Request blocked by filters', { 
        reason: filterResult.reason,
        scenarioName: scenario.name
      });

      await prisma.webhookLog.create({
        data: {
          status: 'blocked',
          requestBody: requestBody,
          responseBody: { 
            reason: filterResult.reason,
            filters: JSON.stringify(filters)
          },
          scenarioName: scenario.name,
          contactEmail: email,
          contactName: name,
          company: company
        }
      });

      return NextResponse.json({
        status: 'blocked',
        reason: filterResult.reason,
        scenario: {
          name: scenario.name,
          filters: filters
        },
        evaluationDetails: filterResult
      }, { status: 200 });
    }

    // Prepare enriched data for forwarding
    const enrichedData = {
      ...requestBody,
      scenario: {
        name: scenario.name,
        type: scenario.scenarioType,
        subjectLine: scenario.subjectLine,
        customizationPrompt: scenario.customizationPrompt,
        emailExamplesPrompt: scenario.emailExamplesPrompt,
        signature: scenario.signature?.signatureContent
      },
      contact: {
        email,
        name,
        company
      }
    };

    logMessage('info', 'Forwarding webhook', { 
      url: userWebhookUrl,
      scenarioName: scenario.name,
      contact: { email, name, company }
    });

    // Forward the webhook
    const response = await fetch(userWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrichedData),
    });

    let responseData;
    const responseText = await response.text();
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { message: responseText };
    }

    // Log the webhook result
    await prisma.webhookLog.create({
      data: {
        status: response.ok ? 'success' : 'error',
        requestBody: requestBody,
        responseBody: responseData,
        scenarioName: scenario.name,
        contactEmail: email,
        contactName: name,
        company: company
      }
    });

    return NextResponse.json({
      status: response.ok ? 'success' : 'error',
      scenario: {
        name: scenario.name,
        type: scenario.scenarioType,
        subjectLine: scenario.subjectLine,
        customizationPrompt: scenario.customizationPrompt,
        emailExamplesPrompt: scenario.emailExamplesPrompt,
        signature: scenario.signature?.signatureContent
      },
      contact: {
        email,
        name,
        company
      },
      filterResult: filterResult,
      forwardResponse: responseData
    }, { status: response.ok ? 200 : 500 });

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    logMessage('error', 'Webhook processing error', { error: errorMessage });

    const { email = 'Unknown', name = 'Unknown', company = 'Unknown' } = 
      requestBody ? getContactInfo(requestBody) : {};

    await prisma.webhookLog.create({
      data: {
        status: 'error',
        requestBody: requestBody || { error: 'Failed to parse request body' },
        responseBody: { error: errorMessage },
        scenarioName: 'Unknown',
        contactEmail: email,
        contactName: name,
        company: company
      }
    });

    return NextResponse.json({
      status: 'error',
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 