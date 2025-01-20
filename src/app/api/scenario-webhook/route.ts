import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
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

// Production-ready logging
function log(level: 'error' | 'info' | 'warn', message: string, data?: any) {
  console[level](JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.VERCEL_ENV || 'development',
    ...data
  }));
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
  let requestBody: WebhookRequestBody;
  try {
    requestBody = await request.json();
    
    // Register webhook fields for future use
    await registerWebhookFields(requestBody);

    // Get all required fields using mappings
    const [
      contactEmail,
      contactFirstName,
      contactLastName,
      scenarioName,
      leadStatus,
      lifecycleStage,
      userWebsite,
      companyName
    ] = await Promise.all([
      getMappedValue(requestBody, 'contactEmail', 'Unknown'),
      getMappedValue(requestBody, 'contactFirstName'),
      getMappedValue(requestBody, 'contactLastName'),
      getMappedValue(requestBody, 'scenarioName', 'Unknown'),
      getMappedValue(requestBody, 'leadStatus'),
      getMappedValue(requestBody, 'lifecycleStage'),
      getMappedValue(requestBody, 'userWebsite'),
      getMappedValue(requestBody, 'companyName', 'Unknown')
    ]);

    // Log mapped values for debugging
    log('info', 'Mapped field values', {
      contactEmail,
      contactFirstName,
      contactLastName,
      scenarioName,
      leadStatus,
      lifecycleStage,
      userWebsite,
      companyName
    });

    if (!contactEmail || contactEmail === 'Unknown') {
      throw new Error('Missing required field: contactEmail');
    }
    if (!scenarioName || scenarioName === 'Unknown') {
      throw new Error('Missing required field: scenarioName');
    }

    // Construct contact name from parts
    const contactName = [contactFirstName, contactLastName]
      .filter(Boolean)
      .join(' ') || 'Unknown';

    log('info', 'Processing webhook request', {
      scenario: scenarioName,
      contact: contactEmail,
      company: companyName
    });

    // Get the scenario with all necessary data
    const scenario = await prisma.scenario.findUnique({
      where: { name: scenarioName },
      include: {
        signature: true,
        prompts: {
          include: {
            prompt: true // Include the related prompt details
          }
        }
      }
    });

    if (!scenario) {
      const error = `Scenario not found: ${scenarioName}`;
      log('error', error);
      
      await prisma.webhookLog.create({
        data: {
          status: 'error',
          requestBody: requestBody,
          responseBody: { error },
          scenarioName: scenarioName || 'Unknown',
          contactEmail,
          contactName,
          company: companyName || 'Unknown'
        }
      });
      
      return NextResponse.json({ 
        status: 'error',
        error,
        request: {
          scenario: scenarioName,
          contact: contactEmail,
          company: companyName
        }
      }, { status: 404 });
    }

    // Process variables in prompts and signature
    const processedScenario = {
      ...scenario,
      subjectLine: scenario.subjectLine ? 
        processWebhookVariables(scenario.subjectLine, requestBody) : '',
      customizationPrompt: scenario.customizationPrompt ? 
        processWebhookVariables(scenario.customizationPrompt, requestBody) : '',
      emailExamplesPrompt: scenario.emailExamplesPrompt ?
        processWebhookVariables(scenario.emailExamplesPrompt, requestBody) : '',
      signature: scenario.signature ? {
        ...scenario.signature,
        signatureContent: processWebhookVariables(scenario.signature.signatureContent, requestBody)
      } : null,
      prompts: scenario.prompts.map(scenarioPrompt => ({
        ...scenarioPrompt.prompt, // Include the full prompt details
        content: processWebhookVariables(scenarioPrompt.prompt.content, requestBody)
      }))
    };

    // Parse and evaluate filters
    let filterGroups: FilterGroup[] = [];
    try {
      const filtersJson = scenario.filters as Prisma.JsonValue;
      log('info', 'Raw filters from database', {
        filtersJson,
        type: typeof filtersJson,
        scenarioName: scenario.name
      });

      // Parse filters and ensure they're in the correct format
      const parsedFilters = filtersJson ? 
        (Array.isArray(filtersJson) ? filtersJson : JSON.parse(String(filtersJson))) as Filter[] : 
        [];
      
      // Transform flat filters array into a single AND group
      filterGroups = parsedFilters.length > 0 ? [{
        logic: 'AND',
        filters: parsedFilters.map(f => ({
          ...f,
          field: f.field?.trim() || '',
          value: f.value?.trim(),
          operator: f.operator as FilterOperator
        }))
      }] : [];
      
      log('info', 'Transformed filters', { 
        filterGroups,
        originalFilters: parsedFilters,
        scenarioName: scenario.name
      });
    } catch (e) {
      log('error', 'Failed to parse filters', { 
        error: String(e), 
        filters: scenario.filters,
        type: typeof scenario.filters
      });
      filterGroups = [];
    }

    // Prepare data for filter evaluation with all possible field variations
    const filterData = {
      ...requestBody,
      contactData: {
        ...requestBody.contactData,
        // Add mapped fields for filter evaluation with variations
        email: contactEmail,
        '{email}': contactEmail,
        'email_address': contactEmail,
        '{email_address}': contactEmail,
        
        first_name: contactFirstName,
        '{first_name}': contactFirstName,
        'firstName': contactFirstName,
        '{firstName}': contactFirstName,
        
        last_name: contactLastName,
        '{last_name}': contactLastName,
        'lastName': contactLastName,
        '{lastName}': contactLastName,
        
        company_name: companyName,
        '{company_name}': companyName,
        'company': companyName,
        '{company}': companyName,
        'PMS': companyName, // Add PMS field variation
        '{PMS}': companyName,
        
        lead_status: leadStatus,
        '{lead_status}': leadStatus,
        'leadStatus': leadStatus,
        '{leadStatus}': leadStatus,
        
        lifecycle_stage: lifecycleStage,
        '{lifecycle_stage}': lifecycleStage,
        'lifecycleStage': lifecycleStage,
        '{lifecycleStage}': lifecycleStage
      }
    };

    log('info', 'Evaluating filters with data', { 
      filterCount: filterGroups.length,
      scenarioName: scenario.name,
      filters: filterGroups.map(g => ({
        logic: g.logic,
        filters: g.filters.map(f => ({
          field: f.field,
          operator: f.operator,
          value: f.value
        }))
      })),
      contactData: {
        ...filterData.contactData,
        // Log specific fields we're interested in
        email: filterData.contactData.email,
        company: filterData.contactData.company,
        PMS: filterData.contactData.PMS,
        lead_status: filterData.contactData.lead_status,
        lifecycle_stage: filterData.contactData.lifecycle_stage
      }
    });

    const filterResult = evaluateFilters(filterGroups, filterData);
    
    log('info', 'Filter evaluation result', {
      passed: filterResult.passed,
      reason: filterResult.reason,
      scenarioName: scenario.name,
      filters: filterGroups.map(g => ({
        logic: g.logic,
        filters: g.filters.map(f => ({
          field: f.field,
          operator: f.operator,
          value: f.value,
          fieldExists: filterData.contactData[f.field.toLowerCase()] !== undefined
        }))
      }))
    });

    if (!filterResult.passed) {
      log('info', 'Request blocked by filters', { 
        reason: filterResult.reason,
        scenarioName: scenario.name,
        filters: filterGroups,
        contactData: filterData.contactData
      });

      // Create webhook log for blocked request
      await prisma.webhookLog.create({
        data: {
          status: 'blocked',
          requestBody: requestBody,
          responseBody: { 
            reason: filterResult.reason,
            filters: JSON.stringify(filterGroups),
            data: filterData.contactData
          },
          scenarioName: scenario.name,
          contactEmail,
          contactName,
          company: companyName || 'Unknown'
        }
      });

      // Return blocked status with details
      return NextResponse.json({
        status: 'blocked',
        reason: filterResult.reason,
        scenario: {
          name: scenario.name,
          filters: filterGroups
        },
        evaluationDetails: filterResult,
        contactData: filterData.contactData // Include contact data for debugging
      }, { status: 200 });
    }

    // Prepare enriched data for forwarding
    const enrichedData = {
      ...requestBody,
      scenario: processedScenario,
      contact: {
        email: contactEmail,
        name: contactName,
        company: companyName
      }
    };

    // Forward the webhook if URL is provided
    let responseData = { message: 'Webhook processed successfully' };
    let responseStatus = 'success';

    // Get forwarding URL with fallback to environment variable
    const forwardingUrl = userWebsite || process.env.DEFAULT_WEBHOOK_URL;
    
    if (forwardingUrl) {
      log('info', 'Forwarding webhook', { 
        url: forwardingUrl,
        scenarioName: scenario.name,
        contact: { email: contactEmail, name: contactName, company: companyName }
      });

      try {
        const response = await fetch(forwardingUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(enrichedData),
        });

        const responseText = await response.text();
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { message: responseText };
        }

        if (!response.ok) {
          responseStatus = 'error';
          responseData = { 
            error: 'Failed to forward webhook',
            status: response.status,
            response: responseData
          };
          log('error', 'Webhook forwarding failed', {
            status: response.status,
            url: forwardingUrl,
            response: responseData
          });
        } else {
          log('info', 'Webhook forwarded successfully', {
            status: response.status,
            url: forwardingUrl
          });
        }
      } catch (error) {
        responseStatus = 'error';
        responseData = { 
          error: 'Failed to forward webhook',
          details: String(error)
        };
        log('error', 'Webhook forwarding error', {
          error: String(error),
          url: forwardingUrl
        });
      }
    } else {
      log('warn', 'No forwarding URL provided', {
        userWebsite,
        defaultUrl: process.env.DEFAULT_WEBHOOK_URL
      });
      responseStatus = 'error';
      responseData = {
        error: 'No forwarding URL provided',
        details: 'Neither user website nor default webhook URL was available'
      };
    }

    // Log the webhook result
    await prisma.webhookLog.create({
      data: {
        status: responseStatus,
        requestBody: requestBody,
        responseBody: responseData,
        scenarioName: scenario.name,
        contactEmail,
        contactName,
        company: companyName || 'Unknown'
      }
    });

    return NextResponse.json({
      status: responseStatus,
      scenario: processedScenario,
      contact: {
        email: contactEmail,
        name: contactName,
        company: companyName
      },
      response: responseData
    });
  } catch (error) {
    log('error', 'Failed to process webhook', { error: String(error) });
    
    // Create error log
    if (requestBody) {
      try {
        await prisma.webhookLog.create({
          data: {
            status: 'error',
            requestBody: requestBody,
            responseBody: { error: String(error) },
            scenarioName: 'Unknown',
            contactEmail: 'Unknown',
            contactName: 'Unknown',
            company: 'Unknown'
          }
        });
      } catch (logError) {
        log('error', 'Failed to create error log', { error: String(logError) });
      }
    }
    
    return NextResponse.json({ 
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      status: 'error',
      details: String(error)
    }, { status: 500 });
  }
} 