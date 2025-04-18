import { NextRequest } from 'next/server';
import { log } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { evaluateFilters, normalizeWebhookData } from '@/lib/filter-utils';
import { Filter } from '@/types/filters';
import { Prisma } from '@prisma/client';
import { processWebhookVariables } from '@/utils/variableReplacer';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { hasValidPaymentMethod, reportScenarioUsage } from '@/lib/stripe';

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
  emailAccountId?: string | null;
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
    } catch (e) {
      log('error', 'Failed to parse request body', { error: String(e) });
      return Response.json({ 
        error: "Invalid request body",
        details: String(e)
      }, { status: 400 });
    }

    const { contactData, userWebhookUrl } = body;
    const scenarioName = contactData?.['Current Scenario '] || contactData?.['Current Scenario'] || contactData?.make_sequence;

    // Log scenario name resolution
    log('info', 'Resolved scenario name', {
      currentScenarioWithSpace: contactData?.['Current Scenario '],
      currentScenarioNoSpace: contactData?.['Current Scenario'],
      makeSequence: contactData?.make_sequence,
      resolvedName: scenarioName
    });

    // Validate required fields
    if (!scenarioName) {
      log('error', 'Missing scenario name', { 
        body,
        currentScenarioWithSpace: contactData?.['Current Scenario '],
        currentScenarioNoSpace: contactData?.['Current Scenario'],
        makeSequence: contactData?.make_sequence
      });
      return Response.json({ 
        error: "Missing scenario name in contactData",
        details: "Either 'Current Scenario', 'Current Scenario ' or make_sequence must be provided"
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

    log('info', 'Found organization and looking up scenario', { 
      organizationId: organization.id,
      scenarioName
    });

    // Create initial webhook log
    const webhookLog = await prisma.webhookLog.create({
      data: {
        status: 'processing',
        scenarioName,
        contactEmail: contactData.email || 'Unknown',
        contactName: contactData.name || 'Unknown',
        company: contactData.company || 'Unknown',
        requestBody: contactData as Record<string, any>,
        accountId: userWebhookUrl,
        organization: {
          connect: {
            id: organization.id
          }
        },
        GHLIntegration: userWebhookUrl ? {
          connect: {
            id: userWebhookUrl
          }
        } : undefined
      }
    });

    log('info', 'Created initial webhook log', { webhookLogId: webhookLog.id });

    // Add detailed billing plan logging
    log('info', 'Organization billing details', {
      organizationId: organization.id,
      billingPlan: organization.billingPlan,
      billingPlanType: typeof organization.billingPlan,
      creditBalance: organization.creditBalance,
      rawBillingPlan: JSON.stringify(organization.billingPlan)
    });

    // Check payment method for at-cost plan
    if (organization.billingPlan?.toLowerCase().trim() === 'at_cost') {
      // Skip payment method check if they have credits
      if (organization.creditBalance <= 0) {
        const hasPaymentMethod = await hasValidPaymentMethod(organization.id);
        if (!hasPaymentMethod) {
          await prisma.webhookLog.update({
            where: { id: webhookLog.id },
            data: {
              status: 'blocked',
              responseBody: {
                error: 'No valid payment method found',
                details: 'Please add a payment method in billing settings to use the at-cost plan'
              } as Record<string, any>
            }
          });

          return Response.json({ 
            error: 'No valid payment method found',
            details: 'Please add a payment method in billing settings to use the at-cost plan'
          }, { status: 402 });
        }
      }

      // Check and reserve credit in a transaction
      try {
        log('info', 'Starting credit check transaction', { 
          organizationId: organization.id,
          webhookLogId: webhookLog.id 
        });

        await prisma.$transaction(async (tx) => {
          const org = await tx.organization.findUnique({
            where: { id: organization.id },
            select: { creditBalance: true }
          });

          if (!org || org.creditBalance < 1) {
            throw new Error('Insufficient credits');
          }

          log('info', 'Found sufficient credits', { 
            currentBalance: org.creditBalance,
            webhookLogId: webhookLog.id 
          });

          // Reserve the credit by updating the balance
          await tx.organization.update({
            where: { id: organization.id },
            data: { creditBalance: org.creditBalance - 1 }
          });

          // Log credit usage
          await tx.creditUsage.create({
            data: {
              organizationId: organization.id,
              amount: -1,
              description: 'Scenario run',
              webhookLogId: webhookLog.id
            }
          });

          log('info', 'Credit deducted successfully', { 
            newBalance: org.creditBalance - 1,
            webhookLogId: webhookLog.id 
          });
        });
      } catch (error) {
        log('error', 'Credit check failed', {
          error: error instanceof Error ? error.message : String(error),
          webhookLogId: webhookLog.id
        });

        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: {
            status: 'blocked',
            responseBody: { 
              error: 'Insufficient credits',
              details: 'Please purchase more credits to continue sending messages'
            } as Record<string, any>
          }
        });

        return Response.json({ 
          error: 'Insufficient credits',
          details: 'Please purchase more credits to continue sending messages'
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
          signature: true,
          filters: true
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
      if (scenario.filters) {
        log('info', 'Raw filters from scenario', { 
          filters: scenario.filters,
          type: typeof scenario.filters 
        });

        try {
          // Parse filters if they're stored as a string
          const filtersData = typeof scenario.filters === 'string' 
            ? JSON.parse(scenario.filters)
            : scenario.filters;

          if (Array.isArray(filtersData)) {
            parsedFilters = filtersData;
            log('info', 'Successfully parsed filters', { 
              parsedFilters,
              filterCount: parsedFilters.length,
              filterGroups: parsedFilters.reduce((acc, f) => {
                if (!acc[f.group || 'default']) acc[f.group || 'default'] = [];
                acc[f.group || 'default'].push(f);
                return acc;
              }, {} as Record<string, any[]>)
            });
          }
        } catch (e) {
          log('error', 'Failed to parse filters', { 
            error: String(e),
            filters: scenario.filters 
          });
          throw new Error('Failed to parse filters');
        }
      } else {
        log('info', 'No filters found in scenario');
      }

      // Normalize webhook data
      const normalizedData = normalizeWebhookData(contactData);
      log('info', 'Normalized webhook data', { 
        original: contactData,
        normalized: normalizedData,
        availableFields: Object.keys(normalizedData.contactData)
      });

      // Evaluate filters with group logic
      const result = await evaluateFilters(parsedFilters, normalizedData);
      
      log('info', 'Filter evaluation result', { 
        passed: result.passed,
        summary: result.summary,
        groupResults: result.results.reduce((acc, r) => {
          const group = r.filter.group || 'default';
          if (!acc[group]) acc[group] = { passed: true, filters: [] };
          acc[group].filters.push(r);
          acc[group].passed = acc[group].passed && r.passed;
          return acc;
        }, {} as Record<string, { passed: boolean; filters: any[] }>)
      });

      // If filters didn't pass, update log and return
      if (!result.passed) {
        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: { 
            status: 'blocked',
            responseBody: { 
              status: 'blocked',
              reason: 'Failed to meet filter criteria',
              filterResults: result
            } as Record<string, any>
          }
        });
        return Response.json({
          status: 'blocked',
          reason: 'Failed to meet filter criteria',
          filterResults: result
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

          // Remove the duplicate credit deduction at the end
          if (
            webhookLog.status === 'success' &&
            organization.billingPlan === 'at_cost'
          ) {
            try {
              await reportScenarioUsage(organization.id);
            } catch (error) {
              console.error('Error reporting scenario usage:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                organizationId: organization.id,
                webhookLogId: webhookLog.id,
              });
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