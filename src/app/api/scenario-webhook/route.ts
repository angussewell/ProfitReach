import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeVariables, processObjectVariables } from '@/utils/variableReplacer';
import { Prompt } from '@prisma/client';

// Types for the webhook request
interface WebhookRequest {
  contactData: Record<string, string>;
  userWebhookUrl?: string;
}

// Error handling utilities
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  return String(error);
}

// Transform webhook data by removing template syntax
function transformWebhookData(data: Record<string, string>): Record<string, string> {
  const transformed: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    const cleanKey = key.replace(/[{}]/g, '');
    transformed[cleanKey] = value;
  }
  return transformed;
}

// Production logging helper
function logProduction(message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    data,
    environment: process.env.VERCEL_ENV || 'unknown'
  };
  console.log(JSON.stringify(logEntry));
}

export async function POST(request: Request) {
  logProduction('Webhook received', { url: request.url });
  
  try {
    // Log raw request details for debugging
    const rawText = await request.text();
    logProduction('Raw webhook data', { rawText });
    
    // Try to parse the JSON
    let rawData: Record<string, string>;
    try {
      rawData = JSON.parse(rawText);
      logProduction('Parsed webhook body', rawData);
    } catch (parseError) {
      logProduction('JSON parse error', { error: getErrorMessage(parseError) });
      
      await prisma.$transaction(async (tx) => {
        const errorLog = await tx.webhookLog.create({
          data: {
            scenarioName: 'unknown',
            contactEmail: 'unknown',
            status: 'error',
            errorMessage: `JSON parse error: ${getErrorMessage(parseError)}`,
            requestBody: { raw: rawText },
          }
        });
        logProduction('Error log created', { logId: errorLog.id });
      });

      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Transform the webhook data
    const cleanData = transformWebhookData(rawData);
    logProduction('Transformed webhook data', cleanData);

    // Verify database connection before proceeding
    await prisma.$connect();
    logProduction('Database connected');

    // Process webhook in transaction
    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.webhookLog.create({
        data: {
          scenarioName: cleanData.make_sequence || 'unknown',
          contactEmail: cleanData.email || 'unknown',
          contactName: cleanData.first_name ? 
            `${cleanData.first_name} ${cleanData.last_name || ''}`.trim() : undefined,
          status: 'success',
          requestBody: rawData,
          responseBody: { processed: true },
        }
      });
      
      logProduction('Webhook log created', { logId: log.id });
      return log;
    });

    logProduction('Webhook processed successfully', { logId: result.id });
    return NextResponse.json({ success: true, logId: result.id });
    
  } catch (error) {
    logProduction('Webhook processing failed', { error: getErrorMessage(error) });
    
    try {
      const errorLog = await prisma.webhookLog.create({
        data: {
          scenarioName: 'unknown',
          contactEmail: 'unknown',
          status: 'error',
          errorMessage: getErrorMessage(error),
          requestBody: { error: getErrorMessage(error) },
        }
      });
      logProduction('Error log created', { logId: errorLog.id });
    } catch (logError) {
      logProduction('Failed to create error log', { error: getErrorMessage(logError) });
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 