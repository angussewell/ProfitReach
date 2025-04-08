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
const workflowCreateSchema = z.object({
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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      const { response, status } = createApiResponse(false, undefined, 'Unauthorized', 401);
      return NextResponse.json(response, { status });
    }
    const organizationId = session.user.organizationId;

    const json = await request.json();
    const validatedData = workflowCreateSchema.safeParse(json);

    if (!validatedData.success) {
      // Include validation details in the response data
      const { response, status } = createApiResponse(
        false, 
        { validationErrors: validatedData.error.format() }, 
        'Invalid input', 
        400
      );
      return NextResponse.json(response, { status });
    }

    // Extract steps along with other data
    const { name, description, dailyContactLimit, dripStartTime, dripEndTime, timezone, steps } = validatedData.data;
    const newWorkflowId = uuidv4();
    const stepsJson = JSON.stringify(steps); // Stringify the steps array

    // Use Prisma.$executeRaw for the INSERT operation with parameterization for security
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
          ${dripStartTime}::time, 
          ${dripEndTime}::time, 
          ${timezone},
          true,
          ${stepsJson}::jsonb,
          NOW(),
          NOW()
        );
      `
    );

    const { response } = createApiResponse(true, { workflowId: newWorkflowId });
    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    // --- CRITICAL: Enhanced Error Logging ---
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! Critical Error inserting workflow:", error); 
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    
    // Log specific details if it's a known Prisma error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma Error Code:", error.code);
      console.error("Prisma Meta:", error.meta);
    }
    // Log validation errors separately if they occur during data processing
    if (error instanceof z.ZodError) {
       console.error("Zod Validation Error during processing:", error.format());
       // Should ideally return 400 here, but keeping 500 for now as per original logic
    }

    // Return a generic error to the client, but keep detailed logs server-side
    const { response, status } = createApiResponse(
        false, 
        undefined, 
        'Database error creating workflow. Check server logs for details.', // More informative generic message
        500
    );
    return NextResponse.json(response, { status });
  }
}
