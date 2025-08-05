import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logging';
import { processWebhookVariables } from '@/utils/variableReplacer';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      organizationId,
      accountId = 'unknown',
      scenarioName = 'unknown',
      contactEmail = 'unknown',
      contactName = 'unknown',
      company = 'unknown',
      requestBody,
      emailSubject,
      emailHtmlBody
    } = data;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Fix issue where emailSubject contains scenario name instead of actual subject line
    let processedEmailSubject = emailSubject;
    
    if (emailSubject && organizationId) {
      try {
        // Check if emailSubject is actually a scenario name by looking it up
        const scenario = await prisma.scenario.findFirst({
          where: {
            name: emailSubject,
            organizationId: organizationId
          }
        });

        // If we found a matching scenario and it has a subjectLine, process it
        if (scenario && scenario.subjectLine && scenario.subjectLine.trim()) {
          // Use requestBody or a combination of the provided data for variable processing
          const webhookData = requestBody || {
            email: contactEmail,
            firstName: contactName?.split(' ')[0] || '',
            lastName: contactName?.split(' ').slice(1).join(' ') || '',
            company: company,
            // Add any other common fields that might be in requestBody
            ...data
          };

          processedEmailSubject = processWebhookVariables(scenario.subjectLine, webhookData);
          
          log('info', 'Processed scenario subject line', {
            scenarioName: emailSubject,
            originalSubjectLine: scenario.subjectLine,
            processedSubject: processedEmailSubject,
            webhookData: webhookData
          });
        }
      } catch (error) {
        log('error', 'Error processing scenario subject line', {
          error: error instanceof Error ? error.message : String(error),
          emailSubject,
          organizationId
        });
        // Continue with original emailSubject if processing fails
      }
    }

    // Create webhook log
    const webhookLog = await prisma.webhookLog.create({
      data: {
        accountId,
        organizationId,
        scenarioName,
        contactEmail,
        contactName,
        company,
        requestBody: requestBody || {},
        status: 'success',
        responseBody: { status: 'success' },
        ...(processedEmailSubject && { emailSubject: processedEmailSubject }),
        ...(emailHtmlBody && { emailHtmlBody })
      }
    });

    log('info', 'Created webhook log', {
      webhookLogId: webhookLog.id,
      organizationId,
      scenarioName,
      hasEmailContent: !!processedEmailSubject || !!emailHtmlBody,
      originalEmailSubject: emailSubject,
      processedEmailSubject: processedEmailSubject
    });

    return NextResponse.json(webhookLog);

  } catch (error) {
    log('error', 'Error creating webhook log:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: 'Failed to create webhook log' },
      { status: 500 }
    );
  }
} 