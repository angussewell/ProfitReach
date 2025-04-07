import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validate as validateUUID } from 'uuid';

// Define or import shared types/schemas if applicable
// Basic Step Schema for validation
const stepSchema = z.object({
  order: z.number().int().positive(),
  actionType: z.string().min(1), // Basic check
  config: z.preprocess((val) => {
    // Special validation for branch percentage split configuration
    if (
      typeof val === 'object' && 
      val !== null && 
      'actionType' in val && 
      val.actionType === 'branch' && 
      'type' in val && 
      val.type === 'percentage_split' && 
      'paths' in val
    ) {
      // Validate that all path weights sum to 100%
      const paths = Array.isArray(val.paths) ? val.paths : [];
      
      // Validate that all paths have nextStepOrder
      const missingNextStepOrder = paths.some(path => 
        typeof path !== 'object' || 
        path === null || 
        typeof path.nextStepOrder !== 'number' ||
        path.nextStepOrder <= 0
      );
      
      if (missingNextStepOrder) {
        throw new Error('All branch paths must have a valid nextStepOrder value');
      }
      
      const totalWeight = paths.reduce((sum, path) => {
        return sum + (typeof path.weight === 'number' ? path.weight : 0);
      }, 0);
      
      if (totalWeight !== 100) {
        throw new Error('Branch path weights must sum to exactly 100%');
      }
    }
    
    return val;
  }, z.record(z.any()).optional()),
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

export async function DELETE(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = session.user.organizationId;
    const { workflowId } = params;

    // Validate UUID
    if (!validateUUID(workflowId)) {
      return NextResponse.json({ error: 'Invalid Workflow ID format.' }, { status: 400 });
    }

    // Use Prisma.$executeRaw for the DELETE operation with parameterized query
    const deleteCount = await prisma.$executeRaw(
      Prisma.sql`
        DELETE FROM "WorkflowDefinition" 
        WHERE "workflowId" = ${workflowId}::uuid AND "organizationId" = ${organizationId}::uuid;
      `
    );

    if (deleteCount === 0) {
      // Check if the workflow exists for this organization
      const workflow = await prisma.workflowDefinition.findUnique({
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
      message: 'Workflow deleted successfully.' 
    }, { status: 200 });

  } catch (error) {
    console.error(`Failed to delete workflow ${params.workflowId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        // Foreign key constraint failed
        return NextResponse.json({ 
          error: 'Cannot delete workflow that has active contacts enrolled.' 
        }, { status: 409 });
      }
      return NextResponse.json({ error: 'Database error deleting workflow.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { workflowId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = session.user.organizationId;
    const { workflowId } = params;

    // Validate UUID
    if (!validateUUID(workflowId)) {
        return NextResponse.json({ error: 'Invalid Workflow ID format.' }, { status: 400 });
    }

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

    // Use Prisma.$executeRaw for the UPDATE operation
    const updateCount = await prisma.$executeRaw(
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
        WHERE "workflowId" = ${workflowId}::uuid AND "organizationId" = ${organizationId}::uuid;
      `
    );

    if (updateCount === 0) {
        // Check if the workflow actually exists for this organization before returning 404
        const workflow = await prisma.workflowDefinition.findUnique({
            where: {
                workflowId: workflowId, // Use the primary ID for findUnique
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle specific Prisma errors
        return NextResponse.json({ error: 'Database error updating workflow.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
