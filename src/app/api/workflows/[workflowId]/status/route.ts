import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth'; 
import { authOptions } from '@/lib/auth';

// Define the expected shape of the request body
const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

export async function PUT(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = session.user.organizationId;
    
    const { workflowId } = params;

    if (!workflowId) {
      return NextResponse.json({ success: false, error: 'Workflow ID is required' }, { status: 400 });
    }

    // Parse and validate the request body
    let parsedBody;
    try {
      const body = await request.json();
      parsedBody = updateStatusSchema.safeParse(body);

      if (!parsedBody.success) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid request body', 
          details: parsedBody.error.format() 
        }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to parse request body' 
      }, { status: 400 });
    }

    const { isActive: newStatus } = parsedBody.data;

    // First check if the workflow exists and belongs to the organization
    const workflow = await prisma.workflowDefinition.findFirst({
      where: {
        workflowId: workflowId,
        organizationId: organizationId
      },
    });

    if (!workflow) {
      return NextResponse.json({ 
        success: false, 
        error: 'Workflow not found or you do not have permission to update it' 
      }, { status: 404 });
    }

    // Use Prisma's type-safe update method instead of raw SQL
    const updatedWorkflow = await prisma.workflowDefinition.update({
      where: {
        workflowId: workflowId,
      },
      data: {
        isActive: newStatus,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Workflow status updated successfully',
      workflow: {
        workflowId: updatedWorkflow.workflowId,
        name: updatedWorkflow.name,
        isActive: updatedWorkflow.isActive
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating workflow status:', error);
    
    // More specific error handling
    if (error instanceof Error) {
      // Handle Prisma client known errors
      if (error.message.includes('Record to update not found')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Workflow not found' 
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: `Error updating workflow: ${error.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
}
