import { NextRequest } from 'next/server';
import { log } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { evaluateFilters, normalizeWebhookData } from '@/lib/filter-utils';
import { Filter } from '@/types/filters';
import { Prisma } from '@prisma/client';
import { processWebhookVariables } from '@/utils/variableReplacer';

// Normalize field names consistently
const normalizeFieldName = (field: string) => field.toLowerCase().replace(/[^a-z0-9]/g, '');

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ScenarioWithSignature {
  id: string;
  name: string;
  touchpointType: string;
  filters: Prisma.JsonValue;
  customizationPrompt: string | null;
  emailExamplesPrompt: string | null;
  subjectLine: string | null;
  signature: {
    content: string;
  } | null;
}

interface ProcessedScenario {
  id: string;
  name: string;
  touchpointType: string;
  subjectLine: string | null;
  customizationPrompt: string | null;
  emailExamplesPrompt: string | null;
  signature: {
    content: string;
  } | null;
}

export async function POST(req: NextRequest) {
  try {
    // Log the start of request processing
    log('info', 'Starting webhook request processing');

    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
      log('info', 'Received webhook request', { body });
      
      // Extract and save webhook fields with normalized names
      if (body.contactData) {
        const fields = Object.keys(body.contactData);
        await Promise.all(fields.map(field => 
          prisma.webhookField.upsert({
            where: {
              name: normalizeFieldName(field)
            },
            update: {},
            create: {
              name: normalizeFieldName(field),
              description: `Field ${field} from webhook`,
              required: false,
              type: 'string'
            }
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
      scenario = await prisma.scenario.findFirst({
        where: { 
          name: scenarioName,
          organizationId: userWebhookUrl
        }
      });

      if (!scenario) {
        log('error', 'Scenario not found', { scenarioName });
        await prisma.webhookLog.create({
          data: {
            status: 'error',
            scenarioName,
            contactEmail: 'Unknown',
            contactName: 'Unknown',
            company: 'Unknown',
            requestBody: contactData as Prisma.JsonObject,
            responseBody: { error: 'Scenario not found' } as Prisma.JsonObject,
            accountId: userWebhookUrl,
            organization: {
              connect: {
                id: userWebhookUrl
              }
            },
            GHLIntegration: {
              connect: {
                id: userWebhookUrl
              }
            }
          }
        });
        return Response.json({ 
          error: "Scenario not found",
          scenarioName 
        }, { status: 404 });
      }

      // Process variables in all text fields
      const processedScenario: ProcessedScenario = {
        id: scenario.id,
        name: scenario.name,
        touchpointType: scenario.touchpointType,
        subjectLine: scenario.subjectLine ? processWebhookVariables(scenario.subjectLine, contactData) : null,
        customizationPrompt: scenario.customizationPrompt ? processWebhookVariables(scenario.customizationPrompt, contactData) : null,
        emailExamplesPrompt: scenario.emailExamplesPrompt ? processWebhookVariables(scenario.emailExamplesPrompt, contactData) : null,
        signature: scenario.signature ? {
          content: processWebhookVariables(scenario.signature.content, contactData)
        } : null
      };

      // Create webhook log
      try {
        await prisma.webhookLog.create({
          data: {
            status: 'success',
            scenarioName: scenario.name,
            contactEmail: contactData.email || 'Unknown',
            contactName: contactData.name || 'Unknown',
            company: contactData.company || 'Unknown',
            requestBody: contactData as Prisma.JsonObject,
            responseBody: processedScenario as unknown as Prisma.JsonObject,
            accountId: userWebhookUrl,
            organization: {
              connect: {
                id: userWebhookUrl
              }
            },
            GHLIntegration: {
              connect: {
                id: userWebhookUrl
              }
            }
          }
        });
      } catch (e) {
        log('error', 'Failed to create webhook log', { error: String(e) });
        // Don't return error - continue with response
      }

      // If filters passed, send outbound webhook
      if (result.passed && userWebhookUrl) {
        try {
          // Fetch all prompts
          const allPrompts = await prisma.prompt.findMany();
          
          // Process variables in all text fields
          const processedPrompts = allPrompts.reduce((acc, prompt) => {
            acc[prompt.name] = processWebhookVariables(prompt.content, contactData);
            return acc;
          }, {} as Record<string, string>);

          // Send outbound webhook
          const webhookResponse = await fetch(userWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contactData,
              scenario: processedScenario,
              prompts: processedPrompts // Now a collection instead of an array
            })
          });

          if (!webhookResponse.ok) {
            throw new Error(`Outbound webhook failed with status ${webhookResponse.status}`);
          }

          log('info', 'Outbound webhook sent successfully', {
            url: userWebhookUrl,
            scenario: processedScenario,
            prompts: processedPrompts
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