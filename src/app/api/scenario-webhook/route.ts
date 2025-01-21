import { NextRequest } from 'next/server';
import { log } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { evaluateFilters, normalizeWebhookData } from '@/lib/filter-utils';
import { Filter } from '@/types/filters';
import { Prisma } from '@prisma/client';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Define type-safe include
const include = Prisma.validator<Prisma.ScenarioInclude>()({
  filters: true,
  prompts: true
});

export async function POST(req: NextRequest) {
  try {
    // Log the start of request processing
    log('info', 'Starting webhook request processing');

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
      include
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
      log('error', 'Scenario not found', { scenarioName });
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
    // Enhanced error logging
    log('error', 'Webhook processing error', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return Response.json({ 
      error: "Internal server error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 