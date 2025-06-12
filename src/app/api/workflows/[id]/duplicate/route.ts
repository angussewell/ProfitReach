import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client'; // Import Prisma namespace for types

// Helper function to find a unique name
async function findUniqueWorkflowName(baseName: string, targetOrganizationId: string): Promise<string> {
  let newName = baseName;
  let counter = 0;
  let nameExists = true;

  while (nameExists) {
    const existingCount = await prisma.workflowDefinition.count({
      where: {
        name: newName,
        organizationId: targetOrganizationId,
      },
    });

    if (existingCount === 0) {
      nameExists = false;
    } else {
      counter++;
      newName = `${baseName} (copy${counter > 1 ? ` ${counter - 1}` : ''})`;
      // Ensure the base name for the next iteration is correct if the first copy also exists
      if (counter === 1) {
         const firstCopyExists = await prisma.workflowDefinition.count({
             where: { name: `${baseName} (copy)`, organizationId: targetOrganizationId },
         }) > 0;
         if (firstCopyExists) {
             newName = `${baseName} (copy 1)`;
         } else {
             newName = `${baseName} (copy)`;
         }
      } else {
         newName = `${baseName} (copy ${counter -1})`;
      }
    }
  }
  return newName;
}


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } } // Parameter name is now 'id'
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const originalWorkflowId = params.id; // Use params.id

  let targetOrganizationId: string;
  try {
    const body = await request.json();
    if (!body.targetOrganizationId || typeof body.targetOrganizationId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid targetOrganizationId' }, { status: 400 });
    }
    targetOrganizationId = body.targetOrganizationId;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    // 1. Fetch the original workflow using the 'id' parameter against the 'workflowId' column
    const originalWorkflow = await prisma.workflowDefinition.findUnique({
      where: { workflowId: originalWorkflowId }, // Query uses the value from params.id
    });

    if (!originalWorkflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // 2. Authorization: Check if the user belongs to the original workflow's organization
    const userOrganizations = await prisma.organization.findMany({
        where: { User: { some: { id: userId } } }, // Corrected relation name from 'users' to 'User'
        select: { id: true }
    });
    const userOrgIds = userOrganizations.map(org => org.id);

    if (!userOrgIds.includes(originalWorkflow.organizationId)) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to the original workflow\'s organization.' }, { status: 403 });
    }

    // Note: We are NOT checking if the user has access to the targetOrganizationId as per requirements.

    // 3. Naming Conflict Resolution
    const baseName = originalWorkflow.name;
    const newName = await findUniqueWorkflowName(baseName, targetOrganizationId);

    // 4. Generate New ID
    const newWorkflowId = uuidv4();

    // 5. Prepare New Data (Deep copy steps JSON)
    // Prisma returns JSONB as JS object/array, stringify for raw query parameter
    const stepsJsonString = JSON.stringify(originalWorkflow.steps);

    // 6. Database Insertion (Raw SQL)
    // Ensure all relevant columns are included and types match the schema
    await prisma.$executeRaw`
      INSERT INTO "WorkflowDefinition" (
        "workflowId", "name", "organizationId", "description", "steps",
        "dailyContactLimit", "dripStartTime", "dripEndTime", "timezone", "isActive",
        "createdAt", "updatedAt"
      ) VALUES (
        ${newWorkflowId}, ${newName}, ${targetOrganizationId}, ${originalWorkflow.description}, ${stepsJsonString}::jsonb,
        ${originalWorkflow.dailyContactLimit}, ${originalWorkflow.dripStartTime}, ${originalWorkflow.dripEndTime}, ${originalWorkflow.timezone}, ${originalWorkflow.isActive},
        NOW(), NOW()
      )
    `;
    // Note: Explicit cast ${stepsJsonString}::jsonb might be needed depending on driver/db version,
    // but Prisma's parameterization usually handles it. Included for safety.

    // 7. Fetch and Return the Newly Created Workflow
    const duplicatedWorkflow = await prisma.workflowDefinition.findUnique({
      where: { workflowId: newWorkflowId },
    });

    if (!duplicatedWorkflow) {
        // This should ideally not happen if the insert succeeded
        console.error(`Failed to fetch duplicated workflow immediately after insertion: ${newWorkflowId}`);
        return NextResponse.json({ error: 'Failed to retrieve duplicated workflow after creation.' }, { status: 500 });
    }

    return NextResponse.json(duplicatedWorkflow, { status: 201 });

  } catch (error) {
    console.error('Workflow Duplication Error:', error);
    // Handle potential Prisma errors or other exceptions
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle specific Prisma errors if needed
        return NextResponse.json({ error: `Database error: ${error.code}`, details: error.message }, { status: 500 });
     }
    return NextResponse.json({ error: 'Internal Server Error during workflow duplication.' }, { status: 500 });
  }
}
