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
  filters: Record<string, any>;
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

    if (!userWebhookUrl) {
      log('error', 'Missing webhook URL', { body });
      return Response.json({ 
        error: "Missing userWebhookUrl in request"
      }, { status: 400 });
    }

    // Find organization by webhook URL
    const organization = await prisma.organization.findUnique({
      where: { webhookUrl: userWebhookUrl }
    });

    if (!organization) {
      log('error', 'Organization not found', { userWebhookUrl });
      return Response.json({ 
        error: "Invalid webhook URL"
      }, { status: 404 });
    }

    log('info', 'Extracted scenario name', { 
      scenarioName,
      contactData,
      userWebhookUrl,
      organizationId: organization.id
    });

    // Get scenario with filters and prompts
    let scenario;
    try {
      scenario = await prisma.scenario.findFirst({
        where: { 
          name: scenarioName,
          organizationId: organization.id
        }
      });

      if (!scenario) {
        log('error', 'Scenario not found', { scenarioName });
        await prisma.webhookLog.create({
          data: {
            status: 'error',
            scenarioName,
            contactEmail: contactData.email || 'Unknown',
            contactName: contactData.name || 'Unknown',
            company: contactData.company || 'Unknown',
            requestBody: contactData as Record<string, any>,
            responseBody: { error: 'Scenario not found' } as Record<string, any>,
            accountId: userWebhookUrl,
            organization: {
              connect: {
                id: organization.id
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

      // Create initial webhook log
      const webhookLog = await prisma.webhookLog.create({
        data: {
          status: 'processing',
          scenarioName: scenario.name,
          contactEmail: contactData.email || 'Unknown',
          contactName: contactData.name || 'Unknown',
          company: contactData.company || 'Unknown',
          requestBody: contactData as Record<string, any>,
          responseBody: {} as Record<string, any>,
          accountId: userWebhookUrl,
          organization: {
            connect: {
              id: organization.id
            }
          },
          GHLIntegration: {
            connect: {
              id: userWebhookUrl
            }
          }
        }
      });

      // Parse and evaluate filters
      let parsedFilters: Filter[] = [];
      try {
        if (scenario.filters) {
          const filtersData = typeof scenario.filters === 'string' 
            ? JSON.parse(scenario.filters)
            : scenario.filters;
          
          if (Array.isArray(filtersData)) {
            parsedFilters = filtersData;
          }
        }
      } catch (e) {
        log('error', 'Failed to parse filters', { error: String(e) });
        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: { 
            status: 'error',
            responseBody: { error: 'Failed to parse filters' } as Record<string, any>
          }
        });
        return Response.json({ error: 'Failed to parse filters' }, { status: 500 });
      }

      // Normalize webhook data
      const normalizedData = normalizeWebhookData(contactData);

      // Evaluate filters
      const result = await evaluateFilters([{ logic: 'AND', filters: parsedFilters }], normalizedData);

      // If filters didn't pass, update log and return
      if (!result.passed) {
        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: { 
            status: 'blocked',
            responseBody: { 
              reason: result.reason,
              filters: parsedFilters
            } as Record<string, any>
          }
        });
        return Response.json({
          status: 'blocked',
          reason: result.reason,
          filters: parsedFilters
        });
      }

      // If filters passed, send outbound webhook
      if (userWebhookUrl) {
        try {
          // Fetch all prompts
          const allPrompts = await prisma.prompt.findMany();
          
          // Process variables in all text fields
          const processedPrompts = allPrompts.reduce((acc: Record<string, string>, prompt: { name: string; content: string }) => {
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
              prompts: processedPrompts
            })
          });

          if (!webhookResponse.ok) {
            throw new Error(`Outbound webhook failed with status ${webhookResponse.status}`);
          }

          // Try to parse response as JSON, fall back to text
          let responseData;
          const contentType = webhookResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            try {
              responseData = await webhookResponse.json();
            } catch (e) {
              responseData = await webhookResponse.text();
            }
          } else {
            responseData = await webhookResponse.text();
          }

          // Update webhook log with success
          await prisma.webhookLog.update({
            where: { id: webhookLog.id },
            data: { 
              status: 'success',
              responseBody: { 
                response: responseData,
                filters: parsedFilters,
                passed: result.passed,
                reason: result.reason
              } as Record<string, any>
            }
          });

          log('info', 'Outbound webhook sent successfully', {
            url: userWebhookUrl,
            scenario: processedScenario,
            prompts: processedPrompts,
            response: responseData
          });

          return Response.json({
            status: 'success',
            data: normalizedData,
            passed: result.passed,
            reason: result.reason,
            filters: parsedFilters
          });

        } catch (e) {
          log('error', 'Failed to send outbound webhook', { error: String(e) });
          await prisma.webhookLog.update({
            where: { id: webhookLog.id },
            data: { 
              status: 'error',
              responseBody: { 
                error: String(e),
                filters: parsedFilters
              } as Record<string, any>
            }
          });
          return Response.json({ 
            error: 'Failed to send outbound webhook',
            details: String(e)
          }, { status: 500 });
        }
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
            scenarioName: scenarioName || 'Unknown',
            contactEmail: contactData?.email || 'Unknown',
            contactName: contactData?.name || 'Unknown',
            company: contactData?.company || 'Unknown',
            requestBody: contactData as Record<string, any> || {},
            responseBody: { error: String(error) } as Record<string, any>,
            accountId: userWebhookUrl,
            organization: {
              connect: {
                id: organization.id
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
        log('error', 'Failed to create error log', { error: String(e) });
      }

      return Response.json({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    log('error', 'Unhandled webhook error', { error: String(error) });
    return Response.json({ 
      error: "Unhandled error",
      details: String(error)
    }, { status: 500 });
  }
} 