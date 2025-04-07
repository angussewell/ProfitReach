import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { createApiResponse } from '@/lib/filters';

// Define the valid action types as a union
const ActionTypeEnum = z.enum([
  'send_email',
  'wait',
  'branch',
  'tag',
  'update_field',
  'webhook',
  'task'
]);

// Define specific config schemas for each action type
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

// Branch percentage split configuration
const branchConfigSchema = z.object({
  type: z.literal('percentage_split'),
  paths: z.array(
    z.object({
      weight: z.number().int().min(1).max(100),
      nextStepOrder: z.number().int().positive()
    })
  ).min(2).refine(
    paths => {
      // Validate that the total weight is exactly 100%
      const totalWeight = paths.reduce((sum, path) => sum + path.weight, 0);
      return totalWeight === 100;
    },
    {
      message: "Path weights must sum to exactly 100%",
      path: ["paths"]
    }
  )
});

// Tag action configuration
const tagConfigSchema = z.object({
  action: z.enum(['add', 'remove']),
  tags: z.array(z.string()),
});

// Update field configuration
const updateFieldConfigSchema = z.object({
  fieldPath: z.string().min(1, { message: 'Field path is required' }),
  value: z.union([z.string(), z.number(), z.boolean()]),
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
    actionType: z.literal('send_email'),
    config: emailConfigSchema,
  }),
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('wait'),
    config: waitConfigSchema,
  }),
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('branch'),
    config: branchConfigSchema,
  }),
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('tag'),
    config: tagConfigSchema,
  }),
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('update_field'),
    config: updateFieldConfigSchema,
  }),
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('webhook'),
    config: webhookConfigSchema,
  }),
  z.object({
    order: z.number().int().positive(),
    actionType: z.literal('task'),
    config: taskConfigSchema,
  }),
]);

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
      const { response } = createApiResponse(true, activeWorkflows);
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
          ${organizationId}::uuid, 
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
    console.error('Failed to create workflow:', error);
    
    const errorMsg = error instanceof Prisma.PrismaClientKnownRequestError 
      ? 'Database error creating workflow.' 
      : (error instanceof Error ? error.message : 'Internal Server Error');
    
    const { response, status } = createApiResponse(false, undefined, errorMsg, 500);
    return NextResponse.json(response, { status });
  }
}
