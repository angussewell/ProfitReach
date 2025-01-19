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
  logMessage('info', 'Webhook received', { url: request.url });
  
  try {
    // Parse request body with validation
    const rawText = await request.text();
    let data: Record<string, any>;
    try {
      data = JSON.parse(rawText);
      logMessage('info', 'Parsed webhook data', { 
        dataKeys: Object.keys(data),
        hasContactData: !!data.contactData
      });
    } catch (parseError) {
      logMessage('error', 'JSON parse error', { error: String(parseError), rawText });
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Get mapped values with detailed logging
    const [
      scenarioName,
      contactEmail,
      contactFirstName,
      contactLastName,
      leadStatus,
      lifecycleStage,
      company
    ] = await Promise.all([
      getMappedValue(data, 'scenarioName').then(value => {
        logMessage('info', 'Mapped scenarioName', { value });
        return value;
      }),
      getMappedValue(data, 'contactEmail').then(value => {
        logMessage('info', 'Mapped contactEmail', { value });
        return value;
      }),
      getMappedValue(data, 'contactFirstName').then(value => {
        logMessage('info', 'Mapped contactFirstName', { value });
        return value;
      }),
      getMappedValue(data, 'contactLastName').then(value => {
        logMessage('info', 'Mapped contactLastName', { value });
        return value;
      }),
      getMappedValue(data, 'leadStatus').then(value => {
        logMessage('info', 'Mapped leadStatus', { value });
        return value;
      }),
      getMappedValue(data, 'lifecycleStage').then(value => {
        logMessage('info', 'Mapped lifecycleStage', { value });
        return value;
      }),
      getMappedValue(data, 'company').then(value => {
        logMessage('info', 'Mapped company', { value });
        return value;
      })
    ]);

    // Verify required fields
    if (!scenarioName || !contactEmail) {
      const error = 'Missing required fields: scenario name and contact email must be mapped';
      logMessage('error', 'Validation error', { 
        scenarioName, 
        contactEmail,
        mappedFields: { scenarioName: !!scenarioName, contactEmail: !!contactEmail }
      });
      return NextResponse.json({ error }, { status: 400 });
    }

    // Fetch all related data in parallel with error handling for each promise
    const [scenario, allPrompts] = await Promise.all([
      prisma.scenario.findUnique({
        where: { name: scenarioName },
        include: { 
          signature: true,
          prompts: true,
          attachments: true
        }
      }).catch(error => {
        logMessage('error', 'Failed to fetch scenario', { error: String(error) });
        throw error;
      }),
      prisma.prompt.findMany({
        orderBy: { createdAt: 'asc' }
      }).catch(error => {
        logMessage('error', 'Failed to fetch prompts', { error: String(error) });
        throw error;
      })
    ]);

    if (!scenario) {
      logMessage('error', 'Scenario not found', { scenarioName });
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Prepare enriched data with only necessary information
    const enrichedData = {
      // Original webhook data preserved
      originalData: data,
      
      // Current scenario details
      scenario: {
        id: scenario.id,
        name: scenario.name,
        type: scenario.scenarioType,
        subjectLine: scenario.subjectLine,
        customizationPrompt: scenario.customizationPrompt,
        emailExamplesPrompt: scenario.emailExamplesPrompt,
        signature: scenario.signature ? {
          id: scenario.signature.id,
          name: scenario.signature.signatureName,
          content: scenario.signature.signatureContent
        } : null,
        prompts: scenario.prompts || [],
        attachments: scenario.attachments || []
      },
      
      // Contact information with mapped fields
      contact: {
        email: contactEmail,
        firstName: contactFirstName,
        lastName: contactLastName,
        name: [contactFirstName, contactLastName].filter(Boolean).join(' '),
        company: company,
        leadStatus: leadStatus,
        lifecycleStage: lifecycleStage,
        data: data.contactData || {}
      },
      
      // All available prompts
      prompts: allPrompts.map(p => ({
        id: p.id,
        name: p.name,
        content: p.content
      }))
    };

    // Log the enriched data size
    logMessage('info', 'Prepared enriched data', {
      dataSize: JSON.stringify(enrichedData).length,
      scenarioPromptsCount: enrichedData.scenario.prompts.length,
      totalPromptsCount: enrichedData.prompts.length
    });

    // Forward to webhook URL if provided
    let forwardResult;
    if (data.userWebhookUrl) {
      forwardResult = await forwardWebhook(data.userWebhookUrl, data, enrichedData);
    }

    // Create webhook log with full context
    const log = await prisma.webhookLog.create({
      data: {
        scenarioName,
        contactEmail,
        contactName: enrichedData.contact.name,
        status: forwardResult?.ok ? 'success' : 'error',
        errorMessage: forwardResult?.error,
        requestBody: {
          ...data,
          mappedFields: {
            contactEmail,
            contactName: enrichedData.contact.name,
            leadStatus,
            lifecycleStage,
            company
          }
        },
        responseBody: forwardResult
      }
    }).catch(error => {
      logMessage('error', 'Failed to create webhook log', { error: String(error) });
      throw error;
    });

    return NextResponse.json({ 
      success: true, 
      logId: log.id,
      forwarded: !!forwardResult,
      forwardSuccess: forwardResult?.ok,
      dataSize: JSON.stringify(enrichedData).length
    });
    
  } catch (error) {
    logMessage('error', 'Webhook processing failed', { 
      error: String(error),
      stack: (error as Error).stack
    });
    return NextResponse.json(
      { error: 'Webhook processing failed', details: String(error) },
      { status: 500 }
    );
  }
} 