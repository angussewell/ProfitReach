import { NextRequest } from 'next/server';
import { log } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { evaluateFilters, normalizeWebhookData } from '@/lib/filter-utils';
import { Filter } from '@/types/filters';
import { Prisma } from '@prisma/client';
import { processWebhookVariables } from '@/utils/variableReplacer';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { hasValidPaymentMethod, updateCreditBalance, reportScenarioUsage } from '@/lib/stripe';
import { Organization, GHLIntegration, EmailAccount, SocialAccount, Prompt } from '@prisma/client';

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

type OrganizationWithRelations = Prisma.OrganizationGetPayload<{
  include: {
    ghlIntegrations: true;
    emailAccounts: {
      where: { isActive: true };
    };
    socialAccounts: {
      where: { isActive: true };
    };
    prompts: true;
  };
}>;

interface ProcessedScenario {
  id: string;
  name: string;
  touchpointType: string;
  subjectLine: string | null;
  customizationPrompt: string | null;
  emailExamplesPrompt: string | null;
  signature: { content: string } | null;
}

interface GHLIntegration {
  id: string;
  locationId: string;
  locationName: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  organizationId: string;
}

interface EmailAccount {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  unipileAccountId: string;
  organizationId: string;
}

interface SocialAccount {
  id: string;
  username: string;
  name: string;
  provider: string;
  isActive: boolean;
  unipileAccountId: string | null;
  organizationId: string;
}

interface Prompt {
  id: string;
  name: string;
  content: string;
  organizationId: string;
}

interface Organization {
  id: string;
  name: string;
  webhookUrl: string;
  outboundWebhookUrl: string | null;
  billingPlan: string;
  creditBalance: number;
  ghlIntegrations: GHLIntegration[];
  emailAccounts: EmailAccount[];
  socialAccounts: SocialAccount[];
  prompts: Prompt[];
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
      
      // Remove automatic field syncing for performance
      
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
      where: { webhookUrl: userWebhookUrl },
      include: {
        ghlIntegrations: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        emailAccounts: {
          where: { isActive: true }
        },
        socialAccounts: {
          where: { isActive: true }
        },
        prompts: true
      }
    }) as OrganizationWithRelations | null;

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

    // Check payment method for at-cost plan
    if (organization.billingPlan === 'at_cost') {
      const hasPaymentMethod = await hasValidPaymentMethod(organization.id);
      if (!hasPaymentMethod) {
        return Response.json({ 
          error: 'No valid payment method found',
          details: 'Please add a payment method in billing settings to use the at-cost plan'
        }, { status: 402 });
      }
    }

    // Get scenario with filters and prompts
    let scenario;
    try {
      scenario = await prisma.scenario.findFirst({
        where: { 
          name: scenarioName,
          organizationId: organization.id
        },
        include: {
          snippet: true,
          attachment: true,
          signature: true
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

      // Get email accounts based on email sender
      let emailAccounts;
      const emailSender = contactData['Email Sender'];
      
      if (emailSender) {
        // If email sender specified, find matching account
        emailAccounts = await prisma.emailAccount.findMany({
          where: {
            organizationId: organization.id,
            isActive: true,
            email: emailSender
          }
        });

        if (emailAccounts.length === 0) {
          // Email sender specified but no matching account found
          return Response.json({ 
            error: "Invalid email sender",
            details: `No active email account found matching sender: ${emailSender}`
          }, { status: 400 });
        }
      } else {
        // If no email sender specified, get all active accounts
        emailAccounts = await prisma.emailAccount.findMany({
          where: {
            organizationId: organization.id,
            isActive: true
          }
        });

        if (emailAccounts.length === 0) {
          return Response.json({ 
            error: "No active email accounts",
            details: "Organization has no active email accounts configured"
          }, { status: 400 });
        }
      }

      // Create initial webhook log
      const webhookLog = await prisma.webhookLog.create({
        data: {
          status: emailSender && emailAccounts.length === 0 ? 'error' : 'processing',
          scenarioName: scenario.name,
          contactEmail: contactData.email || 'Unknown',
          contactName: contactData.name || 'Unknown',
          company: contactData.company || 'Unknown',
          requestBody: contactData as Record<string, any>,
          responseBody: emailSender && emailAccounts.length === 0 
            ? { 
                error: 'Invalid email sender',
                details: `No active email account found matching sender: ${emailSender}`
              } as Record<string, any>
            : {} as Record<string, any>,
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

      // Parse and evaluate filters
      let parsedFilters: Filter[] = [];
      try {
        if (scenario.filters) {
          log('info', 'Raw filters from scenario', { 
            filters: scenario.filters,
            type: typeof scenario.filters 
          });

          const filtersData = typeof scenario.filters === 'string' 
            ? JSON.parse(scenario.filters)
            : scenario.filters;
          
          log('info', 'Parsed filters data', { filtersData });

          if (Array.isArray(filtersData)) {
            parsedFilters = filtersData;
            log('info', 'Successfully parsed filters', { parsedFilters });
          } else {
            log('warn', 'Filters data is not an array', { filtersData });
          }
        } else {
          log('info', 'No filters found in scenario');
        }
      } catch (e) {
        log('error', 'Failed to parse filters', { 
          error: String(e),
          filters: scenario.filters 
        });
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
      log('info', 'Normalized webhook data', { 
        original: contactData,
        normalized: normalizedData 
      });

      // Evaluate filters
      log('info', 'Starting filter evaluation', { 
        filterCount: parsedFilters.length,
        filters: parsedFilters,
        evaluationData: normalizedData.contactData,
        availableFields: Object.keys(normalizedData.contactData)
      });

      const result = await evaluateFilters([{ logic: 'AND', filters: parsedFilters }], normalizedData.contactData);

      log('info', 'Filter evaluation result', { 
        passed: result.passed,
        reason: result.reason
      });

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
          // Process prompts
          const processedPrompts = organization.prompts.reduce((acc, prompt) => {
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
              scenarioData: {
                id: scenario.id,
                name: scenario.name,
                touchpointType: scenario.touchpointType,
                customizationPrompt: scenario.customizationPrompt ? processWebhookVariables(scenario.customizationPrompt, contactData) : null,
                emailExamplesPrompt: scenario.emailExamplesPrompt ? processWebhookVariables(scenario.emailExamplesPrompt, contactData) : null,
                subjectLine: scenario.subjectLine ? processWebhookVariables(scenario.subjectLine, contactData) : null,
                followUp: scenario.isFollowUp || false,
                attachment: scenario.attachment?.content || null,
                attachmentName: scenario.attachment?.name || null,
                snippet: scenario.snippet?.content || null
              },
              prompts: processedPrompts,
              emailData: emailSender 
                ? {
                    email: emailAccounts[0].email,
                    name: emailAccounts[0].name,
                    unipileAccountId: emailAccounts[0].unipileAccountId || ''
                  }
                : emailAccounts.map(account => ({
                    email: account.email,
                    name: account.name,
                    unipileAccountId: account.unipileAccountId || ''
                  }))
            })
          });

          log('info', 'Outbound webhook response received', {
            status: webhookResponse.status,
            statusText: webhookResponse.statusText,
            headers: Object.fromEntries(webhookResponse.headers.entries())
          });

          if (!webhookResponse.ok) {
            throw new Error(`Outbound webhook failed with status ${webhookResponse.status}`);
          }

          // Get response text first
          const responseText = await webhookResponse.text();
          log('info', 'Outbound webhook raw response', { responseText });

          // Try to parse as JSON only if it looks like JSON
          let responseData: any = responseText;
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            try {
              responseData = JSON.parse(responseText);
              log('info', 'Successfully parsed response as JSON', { responseData });
            } catch (e) {
              log('warn', 'Failed to parse response as JSON, using raw text', { 
                error: String(e),
                responseText 
              });
            }
          } else {
            log('info', 'Response is not JSON, using raw text', { responseText });
          }

          // Update webhook log with success - store response as a string if it's not JSON
          await prisma.webhookLog.update({
            where: { id: webhookLog.id },
            data: { 
              status: 'success',
              responseBody: typeof responseData === 'string' 
                ? { response: responseData } 
                : responseData
            }
          });

          log('info', 'Outbound webhook sent successfully', {
            url: userWebhookUrl,
            scenario: processedScenario,
            prompts: processedPrompts,
            response: responseData
          });

          // If the scenario was successful and the organization is on the at_cost plan,
          // deduct a credit and report usage
          if (
            webhookLog.status === 'success' &&
            organization.billingPlan === 'at_cost'
          ) {
            try {
              await prisma.$transaction(async (tx) => {
                await updateCreditBalance(organization.id, -1, 'Scenario run', webhookLog.id);
                await reportScenarioUsage(organization.id);
              });
            } catch (error) {
              // If there are insufficient credits or no active subscription,
              // update the webhook log status
              await prisma.webhookLog.update({
                where: { id: webhookLog.id },
                data: { status: 'blocked' },
              });

              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error('Error processing scenario:', {
                error: errorMessage,
                organizationId: organization.id,
                webhookLogId: webhookLog.id,
              });

              return Response.json(
                { error: 'Insufficient credits or no active subscription' },
                { status: 402 }
              );
            }
          }

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
              responseBody: JSON.stringify({ 
                error: String(e),
                filters: parsedFilters
              })
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