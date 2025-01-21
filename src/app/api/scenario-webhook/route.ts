import { NextResponse } from 'next/server';
import { prisma, log } from '@/lib/utils';
import { registerWebhookFields } from '@/lib/webhook-fields';
import { evaluateFilters } from '@/lib/filter-utils';
import { Filter, FilterGroup, FilterOperator } from '@/types/filters';
import { Prisma } from '@prisma/client';
import { processWebhookVariables } from '@/utils/variableReplacer';
import { normalizeWebhookData } from '@/lib/filter-utils';

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

// Define the include type
const scenarioInclude = {
  filters: true,
  prompts: true
} as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    log('info', 'Received webhook request', { body });

    const { contactData, userWebhookUrl } = body;
    const scenarioName = contactData?.make_sequence;

    log('info', 'Extracted scenario name', { 
      scenarioName,
      contactData,
      userWebhookUrl 
    });

    // Get scenario with filters
    const scenario = await prisma.scenario.findUnique({
      where: { name: scenarioName },
      include: scenarioInclude
    });

    // Parse filters from JSON if needed
    const parsedFilters = scenario?.filters 
      ? (typeof scenario.filters === 'string' 
          ? JSON.parse(scenario.filters) 
          : scenario.filters) as Filter[]
      : [];

    log('info', 'Retrieved scenario', { 
      found: !!scenario,
      scenarioId: scenario?.id,
      filterCount: parsedFilters.length,
      filters: parsedFilters
    });

    if (!scenario) {
      return Response.json({ 
        error: "Scenario not found",
        scenarioName 
      }, { status: 404 });
    }

    // Normalize the webhook data
    const normalizedData = normalizeWebhookData(contactData);
    log('info', 'Normalized webhook data', { 
      original: contactData,
      normalized: normalizedData
    });

    // Structure filters into groups
    const filterGroup = {
      logic: 'and',
      filters: parsedFilters
    };

    log('info', 'Created filter group', { 
      filterGroup,
      filterCount: parsedFilters.length
    });

    // Evaluate filters
    const result = await evaluateFilters([filterGroup], normalizedData);
    
    log('info', 'Filter evaluation result', { 
      result,
      filterGroup,
      normalizedData
    });

    return Response.json({
      data: normalizedData,
      passed: result.passed,
      reason: result.reason,
      filters: parsedFilters,
      debug: {
        scenarioId: scenario.id,
        filterCount: parsedFilters.length,
        normalizedDataKeys: Object.keys(normalizedData)
      }
    });

  } catch (error) {
    log('error', 'Webhook processing error', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
} 