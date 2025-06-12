import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { createApiResponse } from '@/lib/filters';

// ActionTypeEnum and related code removed

// Define specific config schemas for each action type
// Scenario configuration
const scenarioConfigSchema = z.object({
  assignmentType: z.enum(['single', 'random_pool']),
  scenarioIds: z.array(z.string()).min(1, { message: 'At least one scenario ID is required' }),
});

// Email configuration
const emailConfigSchema = z.object({
  templateId: z.string().optional(),
  subject: z.string().min(1, { message: 'Email subject is required' }),
  body: z.string().min(1, { message: 'Email body is required' }),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional(),
});

// Wait/delay configuration
const waitConfigSchema = z.object({
  duration: z.number().int().positive({ message: 'Wait duration must be positive' }),
  unit: z.enum(['minutes', 'hours', 'days']),
});

// Branch config schema removed

// Tag action configuration (Assuming this might still be needed or was missed in the prompt, keeping for now)
// If 'tag' action is not used, this can be removed later.
const tagConfigSchema = z.object({
  action: z.enum(['add', 'remove']),
  tags: z.array(z.string()),
});

// Updated Update field configuration schema
const updateFieldConfigSchema = z.object({
  fieldPath: z.string().min(1, { message: 'Field path is required' }),
  assignmentType: z.enum(['single', 'random_pool']),
  values: z.array(z.string()).min(1, { message: 'At least one value is required' }),
});

// Webhook configuration
const webhookConfigSchema = z.object({
  url: z.string().url({ message: 'Valid webhook URL is required' }),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('POST'),
  headers: z.record(z.string()).optional(),
  body: z.union([z.string(), z.record(z.any())]).optional(),
});

// Task configuration
const taskConfigSchema = z.object({
  title: z.string().min(1, { message: 'Task title is required' }),
  description: z.string().optional(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(), // ISO date string
});

// Use discriminated unions for step validation
const stepSchema = z.discriminatedUnion('actionType', [
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('scenario'),
    config: scenarioConfigSchema,
    customName: z.string().optional(),
  }),
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('send_email'),
    config: emailConfigSchema,
    customName: z.string().optional(),
  }),
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('wait'),
    config: waitConfigSchema,
    customName: z.string().optional(),
  }), // Added closing parenthesis and comma
  // 'branch' literal removed from discriminated union
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('tag'), // Assuming 'tag' action type exists and is needed
    config: tagConfigSchema,
    customName: z.string().optional(),
  }), // Added closing parenthesis and comma
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('update_field'),
    config: updateFieldConfigSchema,
    customName: z.string().optional(),
  }), // Added closing parenthesis and comma
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('webhook'),
    config: webhookConfigSchema,
    customName: z.string().optional(),
  }), // Added closing parenthesis and comma
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('task'),
    config: taskConfigSchema,
    customName: z.string().optional(),
  }), // Added closing parenthesis and comma
  // Added 'clear_field' and 'remove_from_workflow' which were missing
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('clear_field'),
    config: z.object({
      fieldPath: z.string().min(1, { message: 'Field path is required' }),
    }),
    customName: z.string().optional(),
  }), // Added closing parenthesis and comma
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('remove_from_workflow'),
    config: z.object({}).optional(),
    customName: z.string().optional(),
  }), // Added closing parenthesis
]); // Keep closing bracket for discriminatedUnion array

// Zod schema for workflow validation
export const workflowCreateSchema = z.object({
  name: z.string().min(1, { message: 'Workflow name is required.' }),
  description: z.string().optional().nullable(),
  dailyContactLimit: z.number().int().positive().optional().nullable(),
  dripStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid start time format (HH:mm)' }).optional().nullable(),
  dripEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid end time format (HH:mm)' }).optional().nullable(),
  timezone: z.string().optional().nullable(),
  steps: z.array(stepSchema).default([]), // Validate steps array with discriminated union
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      const { response, status } = createApiResponse(false, undefined, 'Unauthorized', 401);
      return NextResponse.json(response, { status });
    }
    const organizationId = session.user.organizationId;

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('active') === 'true';

    if (isActive) {
      const activeWorkflows = await prisma.workflowDefinition.findMany({
        where: {
          organizationId: organizationId,
          isActive: true,
        },
        select: {
          workflowId: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
      
      // Log what we found from database for debugging
      console.log('API /api/workflows?active=true - DB Result:', JSON.stringify(activeWorkflows));
      console.log('API /api/workflows?active=true - Found active workflows count:', activeWorkflows.length);
      
      const { response } = createApiResponse(true, activeWorkflows);
      
      // Log the actual response structure
      console.log('API /api/workflows?active=true - Response structure:', JSON.stringify(response));
      
      return NextResponse.json(response);
    }

    // Return all workflows if active=true isn't specified
    const allWorkflows = await prisma.workflowDefinition.findMany({
      where: {
        organizationId: organizationId,
      },
      select: {
        workflowId: true,
        name: true,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    const { response } = createApiResponse(true, allWorkflows);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to fetch workflows:', error);
    const { response, status } = createApiResponse(
      false, 
      undefined,
      error instanceof Error ? error.message : 'Internal Server Error',
      500
    );
    return NextResponse.json(response, { status });
  }
}

export async function POST(request: Request) {
  console.log("[WORKFLOWS-API] POST request received");
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      console.log("[WORKFLOWS-API] Unauthorized request - no organization ID in session");
      const { response, status } = createApiResponse(false, undefined, 'Unauthorized', 401);
      return NextResponse.json(response, { status });
    }
    const organizationId = session.user.organizationId;
    console.log(`[WORKFLOWS-API] Processing workflow creation for organization: ${organizationId}`);

    // Log entire request body for debugging
    let json;
    try {
      json = await request.json();
      console.log(`[WORKFLOWS-API] Request payload:`, JSON.stringify(json, null, 2));
    } catch (parseError) {
      console.error("[WORKFLOWS-API] Failed to parse request JSON:", parseError);
      const { response, status } = createApiResponse(false, undefined, 'Invalid JSON payload', 400);
      return NextResponse.json(response, { status });
    }

    console.log("[WORKFLOWS-API] Validating workflow data with Zod");
    const validatedData = workflowCreateSchema.safeParse(json);

    if (!validatedData.success) {
      console.error("[WORKFLOWS-API] Zod validation failed:", 
        JSON.stringify(validatedData.error.format(), null, 2));
      // Include validation details in the response data
      const { response, status } = createApiResponse(
        false, 
        { validationErrors: validatedData.error.format() }, 
        'Invalid input', 
        400
      );
      return NextResponse.json(response, { status });
    }

    console.log("[WORKFLOWS-API] Validation successful, preparing data for database");
    // Extract steps along with other data
    const { name, description, dailyContactLimit, dripStartTime, dripEndTime, timezone, steps } = validatedData.data;
    const newWorkflowId = uuidv4();
    
    // Stringify and log steps for debugging
    const stepsJson = JSON.stringify(steps);
    console.log(`[WORKFLOWS-API] Steps JSON (length: ${stepsJson.length}):`, 
      stepsJson.length > 1000 ? stepsJson.substring(0, 1000) + "... (truncated)" : stepsJson);
    
    // Log time values to diagnose potential type casting issues
    console.log(`[WORKFLOWS-API] Time values - Start: "${dripStartTime}" (${typeof dripStartTime}), End: "${dripEndTime}" (${typeof dripEndTime})`);
    
    // For diagnostics, check if any fields are undefined that shouldn't be
    console.log(`[WORKFLOWS-API] Field checks - Name: ${name}, Description: ${description === null ? 'null' : typeof description}, 
      DailyLimit: ${dailyContactLimit === null ? 'null' : dailyContactLimit}, Timezone: ${timezone === null ? 'null' : timezone}`);

    // Handle time value transformation more explicitly
    // If time fields are provided but not in the right format, this could be causing issues
    let startTimeValue = null;
    let endTimeValue = null;
    
    if (dripStartTime) {
      // Verify time format matches HH:MM pattern before passing to SQL
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(dripStartTime)) {
        console.error(`[WORKFLOWS-API] Invalid start time format: ${dripStartTime}`);
        const { response, status } = createApiResponse(
          false, 
          { fieldErrors: { dripStartTime: ['Invalid time format (HH:MM required)'] } }, 
          'Invalid time format', 
          400
        );
        return NextResponse.json(response, { status });
      }
      startTimeValue = dripStartTime;
    }
    
    if (dripEndTime) {
      // Verify time format matches HH:MM pattern before passing to SQL
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(dripEndTime)) {
        console.error(`[WORKFLOWS-API] Invalid end time format: ${dripEndTime}`);
        const { response, status } = createApiResponse(
          false, 
          { fieldErrors: { dripEndTime: ['Invalid time format (HH:MM required)'] } }, 
          'Invalid time format', 
          400
        );
        return NextResponse.json(response, { status });
      }
      endTimeValue = dripEndTime;
    }

    console.log("[WORKFLOWS-API] Executing SQL insert");
    
    // Use Prisma.$executeRaw for the INSERT operation with parameterization for security
    try {
      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "WorkflowDefinition" (
            "workflowId", 
            "organizationId", 
            "name", 
            "description", 
            "dailyContactLimit", 
            "dripStartTime", 
            "dripEndTime", 
            "timezone", 
            "isActive", 
            "steps", 
            "createdAt", 
            "updatedAt"
          ) VALUES (
            ${newWorkflowId}::uuid, 
            ${organizationId}, 
            ${name}, 
            ${description}, 
            ${dailyContactLimit}, 
            ${startTimeValue}::time, 
            ${endTimeValue}::time, 
            ${timezone},
            true,
            ${stepsJson}::jsonb,
            NOW(),
            NOW()
          );
        `
      );
      console.log(`[WORKFLOWS-API] SQL insert successful for workflow ID: ${newWorkflowId}`);
    } catch (error: unknown) {
      const sqlError = error;
      console.error("[WORKFLOWS-API] SQL INSERT FAILED:", sqlError);
      
      // Detailed SQL error diagnostics
      if (sqlError instanceof Prisma.PrismaClientKnownRequestError) {
        console.error(`[WORKFLOWS-API] Prisma Error Code: ${sqlError.code}`);
        console.error(`[WORKFLOWS-API] Prisma Meta:`, JSON.stringify(sqlError.meta, null, 2));
        
        // Handle specific known Prisma errors
        if (sqlError.code === 'P2002') {
          return NextResponse.json(
            createApiResponse(false, undefined, 'A workflow with this name already exists.', 400).response, 
            { status: 400 }
          );
        }
        
        if (sqlError.code === 'P2003') {
          return NextResponse.json(
            createApiResponse(false, undefined, 'Foreign key constraint failed. This may indicate a schema mismatch.', 400).response,
            { status: 400 }
          );
        }
        
        // Column type mismatch often manifests as P2023
        if (sqlError.code === 'P2023') {
          return NextResponse.json(
            createApiResponse(false, undefined, 'Data type validation failed. This may indicate a schema mismatch or invalid data format.', 400).response,
            { status: 400 }
          );
        }
      }
      
      // Handle generic database errors with sufficient detail for diagnosis
      let clientMessage = 'Database error creating workflow.';
      let clientStatus = 500;
      
      // Check for specific error patterns in the message
      const errorMsg = typeof sqlError === 'object' && sqlError !== null 
        ? String(sqlError).toLowerCase() 
        : typeof sqlError === 'string' 
          ? sqlError.toLowerCase()
          : 'unknown error';
      
      if (errorMsg.includes('invalid input syntax') || errorMsg.includes('cannot be cast')) {
        clientMessage = 'Data type mismatch. This may be due to a schema version difference.';
        clientStatus = 400;
      }
      
      if (errorMsg.includes('violates not-null constraint')) {
        clientMessage = 'Required field missing or invalid.';
        clientStatus = 400;
      }
      
      // Check for time-related errors specifically
      if (errorMsg.includes('time') && (errorMsg.includes('format') || errorMsg.includes('syntax'))) {
        clientMessage = 'Invalid time format provided for time fields. Use HH:MM format.';
        clientStatus = 400;
      }
      
      // Return appropriate error to client based on our analysis
      const { response } = createApiResponse(false, undefined, clientMessage, clientStatus);
      return NextResponse.json(response, { status: clientStatus });
    }

    console.log("[WORKFLOWS-API] Successfully created workflow, returning 201 Created");
    const { response } = createApiResponse(true, { workflowId: newWorkflowId });
    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    // --- CRITICAL: Enhanced Error Logging ---
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("[WORKFLOWS-API] CRITICAL ERROR:", error); 
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("[WORKFLOWS-API] Error stack:", error instanceof Error ? error.stack : 'No stack trace available');
    
    // Log specific details if it's a known Prisma error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[WORKFLOWS-API] Prisma Error Code:", error.code);
      console.error("[WORKFLOWS-API] Prisma Meta:", error.meta);
    }
    
    // Log validation errors separately if they occur during data processing
    if (error instanceof z.ZodError) {
       console.error("[WORKFLOWS-API] Zod Validation Error during processing:", error.format());
       
       // Return 400 for validation errors
       const { response } = createApiResponse(
         false, 
         { validationErrors: error.format() },
         'Validation failed during processing',
         400
       );
       return NextResponse.json(response, { status: 400 });
    }

    // Return a generic error to the client, but keep detailed logs server-side
    const { response, status } = createApiResponse(
        false, 
        undefined, 
        'An unexpected error occurred while creating the workflow. The issue has been logged for investigation.', 
        500
    );
    return NextResponse.json(response, { status });
  }
}
