import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validate as validateUUID } from 'uuid';
import { ActionType } from '@/types/workflow'; // Import ActionType
import { createApiResponse } from '@/lib/filters'; // Import createApiResponse

// Define or import shared types/schemas if applicable

// Updated Update field configuration schema for validation within PUT
const updateFieldConfigSchemaPUT = z.object({
  fieldPath: z.string().min(1).optional(), // Optional for PUT
  assignmentType: z.enum(['single', 'random_pool']).optional(), // Optional for PUT
  values: z.array(z.string()).min(1).optional(), // Optional for PUT
}).optional(); // Config itself is optional

// Basic Step Schema for validation (simplified for PUT, branch removed)
const stepSchema = z.object({
  clientId: z.string().uuid().optional(), // Keep clientId if present
  order: z.number().int().positive(),
  actionType: z.string().min(1), // Basic check, could refine with ActionType enum
  customName: z.string().optional(),
  config: z.record(z.any()).optional(), // Keep config flexible for PUT, specific validation removed
  // Branch preprocess removed
});

// Zod schema for validation (all fields optional for update, including steps)
const workflowUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  dailyContactLimit: z.number().int().positive().optional().nullable(),
  dripStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid start time format (HH:mm)' }).optional().nullable(),
  dripEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  timezone: z.string().optional().nullable(),
  steps: z.array(stepSchema).optional(), // Add optional steps validation
});

export async function GET(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      const { response, status } = createApiResponse(false, undefined, 'Unauthorized', 401);
      return NextResponse.json(response, { status });
    }
    
    // Extract force parameter from URL
    const url = new URL(request.url);
    const forceView = url.searchParams.get('force') === 'true';
    
    const organizationId = session.user.organizationId;
    const { workflowId } = params;

    // Validate UUID unless force view is enabled
    if (!forceView && !validateUUID(workflowId)) {
      const { response, status } = createApiResponse(false, undefined, 'Invalid Workflow ID format.', 400);
      return NextResponse.json(response, { status });
    }

    console.log(`Fetching workflow: ${workflowId}, Force: ${forceView}`);

    // Fetch the workflow from database, using findFirst for non-standard IDs
    const workflow = forceView ? 
      await prisma.workflowDefinition.findFirst({
        where: {
          workflowId: workflowId,
          organizationId: organizationId,
        },
      }) : 
      await prisma.workflowDefinition.findUnique({
        where: {
          workflowId: workflowId,
          organizationId: organizationId,
        },
      });

    if (!workflow) {
      const { response, status } = createApiResponse(false, undefined, 'Workflow not found.', 404);
      return NextResponse.json(response, { status });
    }

    // Return the workflow data
    const { response } = createApiResponse(true, workflow);
    return NextResponse.json(response);

  } catch (error) {
    console.error(`Failed to fetch workflow ${params.workflowId}:`, error);
    const { response, status } = createApiResponse(
      false, 
      undefined,
      error instanceof Error ? error.message : 'Internal Server Error',
      500
    );
    return NextResponse.json(response, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract force parameter from URL
    const url = new URL(request.url);
    const forceDelete = url.searchParams.get('force') === 'true';
    
    const organizationId = session.user.organizationId;
    const { workflowId } = params;

    // Validate UUID unless force delete is enabled
    if (!forceDelete && !validateUUID(workflowId)) {
      return NextResponse.json({ error: 'Invalid Workflow ID format.' }, { status: 400 });
    }

    console.log(`Attempting to delete workflow: ${workflowId}, Force: ${forceDelete}`);

    let deleteCount;
    
    // Use different deletion strategy based on whether it's a force delete or not
    if (forceDelete) {
      // For force deletion, use deleteMany which is more forgiving with non-standard IDs
      const result = await prisma.workflowDefinition.deleteMany({
        where: {
          workflowId: workflowId,
          organizationId: organizationId
        }
      });
      deleteCount = result.count;
    } else {
      // For standard deletion, use the original raw SQL approach
      deleteCount = await prisma.$executeRaw(
        Prisma.sql`
          DELETE FROM "WorkflowDefinition" 
          WHERE "workflowId" = ${workflowId} AND "organizationId" = ${organizationId};
        `
      );
    }

    if (deleteCount === 0) {
      // Check if the workflow exists for this organization
      const workflow = await prisma.workflowDefinition.findFirst({
        where: {
          workflowId: workflowId,
        },
        select: { organizationId: true }
      });

      if (!workflow) {
        return NextResponse.json({ error: 'Workflow not found.' }, { status: 404 });
      } else if (workflow.organizationId !== organizationId) {
        return NextResponse.json({ error: 'Access denied to this workflow.' }, { status: 403 });
      } else {
        // This should rarely happen - if we get here, something unexpected occurred
        return NextResponse.json({ error: 'Failed to delete workflow.' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Workflow ${forceDelete ? 'force ' : ''}deleted successfully.` 
    }, { status: 200 });

  } catch (error) {
    console.error(`Failed to delete workflow ${params.workflowId}:`, error);
    
    // Enhanced error logging with type checking
    if (error && typeof error === 'object') {
      const err = error as Error;
      console.error('Error details:', {
        workflowId: params.workflowId,
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack
      });
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        // Foreign key constraint failed
        return NextResponse.json({ 
          error: 'Cannot delete workflow that has active contacts enrolled.' 
        }, { status: 409 });
      }
      // More specific error message for database errors
      return NextResponse.json({ 
        error: `Database error deleting workflow. Error code: ${error.code}`,
        details: error.message
      }, { status: 500 });
    }
    
    // Generic error response with more details
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? String(error.message) 
      : 'Unknown error occurred during workflow deletion';
      
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: errorMessage
    }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { workflowId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract force parameter from URL
    const url = new URL(request.url);
    const forceUpdate = url.searchParams.get('force') === 'true';
    
    const organizationId = session.user.organizationId;
    const { workflowId } = params;

    // Validate UUID unless force update is enabled
    if (!forceUpdate && !validateUUID(workflowId)) {
        return NextResponse.json({ error: 'Invalid Workflow ID format.' }, { status: 400 });
    }

    console.log(`Attempting to update workflow: ${workflowId}, Force: ${forceUpdate}`);

    const json = await request.json();
    const validatedData = workflowUpdateSchema.safeParse(json);

    if (!validatedData.success) {
      return NextResponse.json({ error: 'Invalid input', details: validatedData.error.errors }, { status: 400 });
    }

    // Extract validated data, providing null for fields not present in the request
    // This allows COALESCE in SQL to work correctly, keeping the original value if not provided
    const {
        name = null,
        description = null,
        dailyContactLimit = null,
        dripStartTime = null,
        dripEndTime = null,
        timezone = null,
        steps = null // Extract optional steps, default to null
    } = validatedData.data;

    // Stringify steps only if they were provided
    const stepsJson = steps ? JSON.stringify(steps) : null;

    let updateCount;

    // Use different update strategy based on whether it's a force update or not
    if (forceUpdate) {
      // For force update, use update ORM method which is more forgiving with non-standard IDs
      try {
        // First fetch the current workflow to get values we want to preserve
        const currentWorkflow = await prisma.workflowDefinition.findFirst({
          where: {
            workflowId: workflowId,
            organizationId: organizationId
          }
        });

        if (!currentWorkflow) {
          return NextResponse.json({ error: 'Workflow not found.' }, { status: 404 });
        }

        // Update with Prisma ORM
        const result = await prisma.workflowDefinition.updateMany({
          where: {
            workflowId: workflowId,
            organizationId: organizationId
          },
          data: {
            name: name || currentWorkflow.name,
            description: description !== null ? description : currentWorkflow.description,
            dailyContactLimit: dailyContactLimit !== null ? dailyContactLimit : currentWorkflow.dailyContactLimit,
            dripStartTime: dripStartTime ? new Date(`1970-01-01T${dripStartTime}:00Z`) : currentWorkflow.dripStartTime,
            dripEndTime: dripEndTime ? new Date(`1970-01-01T${dripEndTime}:00Z`) : currentWorkflow.dripEndTime,
            timezone: timezone !== null ? timezone : currentWorkflow.timezone,
            steps: stepsJson ? JSON.parse(stepsJson) : currentWorkflow.steps,
            updatedAt: new Date()
          }
        });
        updateCount = result.count;
      } catch (updateError) {
        console.error('Error during force update:', updateError);
        throw updateError;
      }
    } else {
      // For standard update, use the original raw SQL approach
      updateCount = await prisma.$executeRaw(
        Prisma.sql`
          UPDATE "WorkflowDefinition" 
          SET 
            "name" = COALESCE(${name}, "name"), 
            "description" = COALESCE(${description}, "description"), 
            "dailyContactLimit" = COALESCE(${dailyContactLimit}, "dailyContactLimit"), 
            "dripStartTime" = COALESCE(${dripStartTime}::time, "dripStartTime"),
            "dripEndTime" = COALESCE(${dripEndTime}::time, "dripEndTime"),
            "timezone" = COALESCE(${timezone}, "timezone"),
            -- Update steps using COALESCE with the potentially null stringified JSON
            "steps" = COALESCE(${stepsJson}::jsonb, "steps"),
            "updatedAt" = NOW()
          WHERE "workflowId" = ${workflowId} AND "organizationId" = ${organizationId};
        `
      );
    }

    if (updateCount === 0) {
        // Check if the workflow actually exists for this organization before returning 404
        const workflow = await prisma.workflowDefinition.findFirst({
            where: {
                workflowId: workflowId,
            },
            select: { organizationId: true } // Select orgId to verify ownership
        });

        // Check if workflow exists and belongs to the correct organization
        if (!workflow || workflow.organizationId !== organizationId) {
            return NextResponse.json({ error: 'Workflow not found or access denied.' }, { status: 404 });
        } else {
            // If it exists and belongs to the org, but updateCount is 0, 
            // it means no actual changes were made or there was another issue. 
            // Returning 200 is acceptable if no change is not an error.
            // or there was another issue. Returning 200 might be acceptable if no change is not an error.
            // Let's return 200 but indicate no changes were applied if needed, or just return success.
             return NextResponse.json({ workflowId: workflowId, message: "No changes detected or applied." }, { status: 200 });
        }
    }

    return NextResponse.json({ workflowId: workflowId }, { status: 200 });

  } catch (error) {
    console.error(`Failed to update workflow ${params.workflowId}:`, error);
    
    // Enhanced error logging with type checking
    if (error && typeof error === 'object') {
      const err = error as Error;
      console.error('Error details:', {
        workflowId: params.workflowId,
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack
      });
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors
      return NextResponse.json({ 
        error: `Database error updating workflow. Error code: ${error.code}`,
        details: error.message
      }, { status: 500 });
    }
    
    // Generic error response with more details
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? String(error.message) 
      : 'Unknown error occurred during workflow update';
      
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: errorMessage
    }, { status: 500 });
  }
}
