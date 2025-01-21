import { NextRequest } from 'next/server';
import { log } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { evaluateFilters, normalizeWebhookData } from '@/lib/filter-utils';
import { Filter } from '@/types/filters';
import { Prisma } from '@prisma/client';
import { processWebhookVariables } from '@/utils/variableReplacer';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Log the start of request processing
    log('info', 'Starting webhook request processing');

    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
      log('info', 'Received webhook request', { body });
      
      // Extract and save webhook fields
      if (body.contactData) {
        const fields = Object.keys(body.contactData);
        await Promise.all(fields.map(field => 
          prisma.webhookField.upsert({
            where: { field },
            create: { field },
            update: {} // No updates needed
          })
        ));
        log('info', 'Saved webhook fields', { fields });
      }
    } catch (e) {
      log('error', 'Failed to parse request body', { error: String(e) });
      return Response.json({ 
        error: "Invalid request body",
        details: String(e)
      }, { status: 400 });
    }

    const { contactData, userWebhookUrl } = body;
    const scenarioName = contactData?.make_sequence;

    // Validate required fields
    if (!scenarioName) {
      log('error', 'Missing scenario name', { body });
      return Response.json({ 
        error: "Missing make_sequence in contactData"
      }, { status: 400 });
    }

    log('info', 'Extracted scenario name', { 
      scenarioName,
      contactData,
      userWebhookUrl 
    });

    // Get scenario with filters and prompts
    let scenario;
    try {
      scenario = await prisma.scenario.findUnique({
        where: { name: scenarioName },
        select: {
          id: true,
          name: true,
          filters: true,
          prompts: true,
          subjectLine: true,
          customizationPrompt: true,
          emailExamplesPrompt: true,
          signature: {
            select: {
              signatureContent: true
            }
          }
        }
      });
    } catch (e) {
      log('error', 'Database query failed', { 
        error: String(e),
        scenarioName 
      });
      return Response.json({ 
        error: "Failed to fetch scenario",
        details: String(e)
      }, { status: 500 });
    }

    if (!scenario) {
      log('error', 'Scenario not found', { scenarioName });
      return Response.json({ 
        error: "Scenario not found",
        scenarioName 
      }, { status: 404 });
    }

    // Parse filters with error handling
    let parsedFilters: Filter[] = [];
    try {
      parsedFilters = scenario.filters 
        ? (typeof scenario.filters === 'string' 
            ? JSON.parse(scenario.filters) 
            : scenario.filters) as Filter[]
        : [];
    } catch (e) {
      log('error', 'Failed to parse filters', { 
        error: String(e),
        filters: scenario.filters 
      });
      return Response.json({ 
        error: "Invalid filter format",
        details: String(e)
      }, { status: 500 });
    }

    log('info', 'Retrieved scenario', { 
      scenarioId: scenario.id,
      filterCount: parsedFilters.length,
      filters: parsedFilters
    });

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

    // Evaluate filters with error handling
    let result;
    try {
      result = await evaluateFilters([filterGroup], normalizedData);
    } catch (e) {
      log('error', 'Filter evaluation failed', { 
        error: String(e),
        filterGroup 
      });
      return Response.json({ 
        error: "Filter evaluation failed",
        details: String(e)
      }, { status: 500 });
    }
    
    log('info', 'Filter evaluation result', { 
      result,
      filterGroup,
      normalizedData
    });

    // Create webhook log
    try {
      await prisma.webhookLog.create({
        data: {
          status: result.passed ? 'success' : 'blocked',
          scenarioName: scenario.name,
          contactEmail: contactData.email || 'Unknown',
          contactName: [contactData.first_name, contactData.last_name].filter(Boolean).join(' ') || 'Unknown',
          company: contactData.company || 'Unknown',
          requestBody: body,
          responseBody: JSON.parse(JSON.stringify({
            passed: result.passed,
            reason: result.reason,
            filters: parsedFilters
          }))
        }
      });
    } catch (e) {
      log('error', 'Failed to create webhook log', { error: String(e) });
      // Don't return error - continue with response
    }

    // If filters passed, send outbound webhook
    if (result.passed && userWebhookUrl) {
      try {
        // Process variables in all text fields
        const processedScenario = {
          ...scenario,
          subjectLine: processWebhookVariables(scenario.subjectLine, contactData),
          customizationPrompt: scenario.customizationPrompt ? processWebhookVariables(scenario.customizationPrompt, contactData) : null,
          emailExamplesPrompt: scenario.emailExamplesPrompt ? processWebhookVariables(scenario.emailExamplesPrompt, contactData) : null,
        signature: scenario.signature ? {
            signatureContent: processWebhookVariables(scenario.signature.signatureContent, contactData)
        } : null,
          prompts: scenario.prompts.map(prompt => ({
            ...prompt,
            content: processWebhookVariables(prompt.content, contactData)
      }))
    };

        // Send outbound webhook
        const webhookResponse = await fetch(userWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contactData,
            scenario: {
              ...processedScenario,
              prompts: undefined // Remove prompts from scenario
            },
            prompts: processedScenario.prompts // Add prompts at root level
          })
        });

        if (!webhookResponse.ok) {
          throw new Error(`Outbound webhook failed with status ${webhookResponse.status}`);
        }

        log('info', 'Outbound webhook sent successfully', {
          url: userWebhookUrl,
          scenario: processedScenario
        });
      } catch (e) {
        log('error', 'Failed to send outbound webhook', { error: String(e) });
        // Don't return error - continue with response
      }
    }

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
    // Enhanced error logging
    log('error', 'Webhook processing error', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Try to create error log
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
    } catch (e) {
      log('error', 'Failed to create error log', { error: String(e) });
    }

    return Response.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 