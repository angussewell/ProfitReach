import { NextResponse } from 'next/server';
import { prisma, log } from '@/lib/utils';
import { registerWebhookFields } from '@/lib/webhook-fields';
import { evaluateFilters } from '@/lib/filter-utils';
import { Filter, FilterGroup, FilterOperator } from '@/types/filters';
import { Prisma } from '@prisma/client';
import { processWebhookVariables } from '@/utils/variableReplacer';

interface WebhookRequestBody {
  contactData?: Record<string, any>;
  [key: string]: any;
}

interface WebhookResponse {
  message?: string;
  error?: string;
  details?: string;
  status?: string;
  response?: any;
}

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
      log('info', 'No mapping found for field', { systemField });
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
      log('info', 'No value found for mapped field', { systemField, webhookField });
      return fallback;
    }

    return String(value);
  } catch (error) {
    log('error', 'Error getting mapped value', { 
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

    log('info', 'Preparing to forward data', { 
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
    log('info', 'Webhook forwarded', {
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
    log('error', 'Failed to forward webhook', { error: String(error) });
    return { 
      ok: false, 
      error: String(error)
    };
  }
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
  try {
    // Validate request
    if (!request.body) {
      return NextResponse.json({ 
        passed: false, 
        reason: 'Missing request body' 
      }, { status: 400 });
    }

    const requestBody = await request.json();
    
    // Validate required fields
    if (!requestBody.contactData) {
      return NextResponse.json({ 
        passed: false, 
        reason: 'Missing contactData in request' 
      }, { status: 400 });
    }

    // Extract contact info
    const contactInfo = {
      email: requestBody.contactData.email || 'Unknown',
      name: [
        requestBody.contactData.first_name,
        requestBody.contactData.last_name
      ].filter(Boolean).join(' ') || 'Unknown',
      company: requestBody.contactData.company || 'Unknown'
    };

    // Log incoming request
    log('info', 'Received webhook request', {
      make_sequence: requestBody.contactData.make_sequence,
      ...contactInfo
    });

    // Normalize data structure
    const normalizedData = {
      contactData: {
        ...requestBody.contactData,
        PMS: requestBody.contactData?.PMS || 
             requestBody.contactData?.propertyManagementSoftware || 
             requestBody.propertyManagementSoftware
      }
    };

    // Get scenario
    const scenario = await prisma.scenario.findFirst({
      where: {
        name: requestBody.contactData?.make_sequence
      },
      select: {
        id: true,
        name: true,
        filters: true,
        prompts: true
      }
    });

    if (!scenario) {
      const error = `No scenario found for ${requestBody.contactData?.make_sequence}`;
      log('error', error, { make_sequence: requestBody.contactData?.make_sequence });
      
      // Create error log
      await prisma.webhookLog.create({
        data: {
          status: 'error',
          scenarioName: requestBody.contactData?.make_sequence || 'Unknown',
          contactEmail: contactInfo.email,
          contactName: contactInfo.name,
          company: contactInfo.company,
          requestBody: requestBody,
          responseBody: { error }
        }
      });

      return NextResponse.json({
        passed: false,
        reason: error,
        data: normalizedData
      }, { status: 400 });
    }

    // Parse filters with error handling
    let filterGroups = [];
    try {
      filterGroups = scenario.filters ? JSON.parse(String(scenario.filters)) : [];
    } catch (error) {
      log('error', 'Failed to parse filters', { 
        error: String(error),
        filters: scenario.filters 
      });
      filterGroups = [];
    }
    
    // Evaluate filters using normalized data
    const { passed, reason } = await evaluateFilters(filterGroups, normalizedData);

    // Log result
    log('info', 'Filter evaluation complete', {
      passed,
      reason,
      scenario: scenario.name,
      filterGroups
    });

    // Create webhook log
    await prisma.webhookLog.create({
      data: {
        status: passed ? 'success' : 'blocked',
        scenarioName: scenario.name,
        contactEmail: contactInfo.email,
        contactName: contactInfo.name,
        company: contactInfo.company,
        requestBody: requestBody,
        responseBody: {
          passed,
          reason,
          data: normalizedData,
          filters: scenario.filters
        }
      }
    });

    // Return consistent data structure
    return NextResponse.json({
      passed,
      reason,
      data: normalizedData,
      filters: scenario.filters,
      prompts: scenario.prompts
    });

  } catch (error) {
    // Log the full error
    log('error', 'Webhook processing failed', { 
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Create error log
    try {
      await prisma.webhookLog.create({
        data: {
          status: 'error',
          scenarioName: 'Unknown',
          contactEmail: 'Unknown',
          contactName: 'Unknown',
          company: 'Unknown',
          requestBody: {},
          responseBody: { error: String(error) }
        }
      });
    } catch (logError) {
      log('error', 'Failed to create error log', { error: String(logError) });
    }

    return NextResponse.json({ 
      passed: false,
      reason: String(error),
      data: {}
    }, { status: 500 });
  }
} 