import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { URLSearchParams } from 'url'; // Import URLSearchParams

// GET /api/workflows/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Auth: get user session
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch workflow by workflowId
  const workflow = await prisma.workflowDefinition.findUnique({
    where: { workflowId: params.id },
  });

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  // 3. Authorization: check user belongs to workflow's organization
  // Adjust this logic to your user/org model
  // Try session.user.organizationId (singular) or organizations (array)
  const userOrgId = session.user.organizationId;
  const userOrgIds = session.user.organizations
    ? session.user.organizations.map((org: any) => org.id)
    : userOrgId
    ? [userOrgId]
    : [];

  if (!workflow.organizationId || !userOrgIds.includes(workflow.organizationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Fetch contact counts per step for this workflow
  let stepCountsMap: Record<number, number> = {};
  try {
    const stepCountsResult = await prisma.contactWorkflowState.groupBy({
      by: ['currentStepOrder'],
      _count: {
        currentStepOrder: true,
      },
      where: {
        workflowId: params.id,
        organizationId: workflow.organizationId, // Use orgId from the fetched workflow
        // Optionally filter by status if needed, e.g., only 'active' or 'waiting' contacts
        // status: { in: ['active', 'waiting_delay', 'waiting_scenario'] } 
      },
    });

    // Process results into a map { stepOrder: count }
    stepCountsResult.forEach(item => {
      stepCountsMap[item.currentStepOrder] = item._count.currentStepOrder;
    });

  } catch (error) {
    console.error(`Failed to fetch step counts for workflow ${params.id}:`, error);
    // Non-fatal error, proceed without counts
  }

  // 5. Success: return workflow data along with step counts
  return NextResponse.json({
    ...workflow,
    stepCounts: stepCountsMap, // Add the counts map to the response
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  // 1. Auth
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch workflow
  const workflow = await prisma.workflowDefinition.findUnique({
    where: { workflowId: params.id },
  });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  // 3. Authorization
  const userOrgId = session.user.organizationId;
  const userOrgIds = session.user.organizations
    ? session.user.organizations.map((org: any) => org.id)
    : userOrgId
    ? [userOrgId]
    : [];
  if (!userOrgIds.includes(workflow.organizationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Parse and validate body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const {
    name,
    description,
    steps,
    // isActive is extracted here
    isActive: isActiveFromBody,
    dailyContactLimit,
    dripStartTime,
    dripEndTime,
    timezone,
  } = body;

  if (!name || typeof name !== "string" || !Array.isArray(steps)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // --- START: Handle isActive ---
  // Default to true if isActive is null or undefined in the request body
  const isActive = isActiveFromBody === null || isActiveFromBody === undefined
    ? true
    : Boolean(isActiveFromBody);
  // --- END: Handle isActive ---


  // 5. Update with raw SQL
  try {
    await prisma.$executeRaw`
      UPDATE "WorkflowDefinition"
      SET
        "name" = ${name},
        "description" = ${description},
        "steps" = ${JSON.stringify(steps)}::jsonb,
        "isActive" = ${isActive}, -- Use the processed isActive value
        "dailyContactLimit" = ${dailyContactLimit},
        "dripStartTime" = ${dripStartTime}::time,
        "dripEndTime" = ${dripEndTime}::time,
        "timezone" = ${timezone},
        "updatedAt" = NOW()
      WHERE "workflowId" = ${params.id}
    `;
  } catch (err) {
    // Log the specific error for better debugging
    console.error("Database update failed:", err);
    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
  }

  // 6. Fetch and return updated workflow
  const updated = await prisma.workflowDefinition.findUnique({
    where: { workflowId: params.id },
  });
  return NextResponse.json(updated, { status: 200 });
}

// DELETE /api/workflows/[id]?force=true
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  // 1. Auth
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch workflow to check existence and ownership
  let workflow;
  try {
    workflow = await prisma.workflowDefinition.findUnique({
      where: { workflowId: params.id },
      select: { organizationId: true } // Only select necessary field for auth check
    });
  } catch (err) {
    console.error("Error fetching workflow for delete:", err);
    return NextResponse.json({ error: "Failed to check workflow existence" }, { status: 500 });
  }

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  // 3. Authorization
  const userOrgId = session.user.organizationId;
  const userOrgIds = session.user.organizations
    ? session.user.organizations.map((org: any) => org.id)
    : userOrgId
    ? [userOrgId]
    : [];
  if (!userOrgIds.includes(workflow.organizationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Parse 'force' query parameter
  const { searchParams } = new URL(request.url);
  const forceDelete = searchParams.get('force') === 'true';
  const workflowId = params.id;

  try {
    if (forceDelete) {
      // Force delete: Remove dependencies first within a transaction
      await prisma.$transaction(async (tx) => {
        // Delete execution logs associated with the workflow's states
        // We need to find the state IDs first
        const statesToDelete = await tx.contactWorkflowState.findMany({
          where: { workflowId: workflowId },
          select: { stateId: true }
        });
        const stateIds = statesToDelete.map(s => s.stateId);

        if (stateIds.length > 0) {
          await tx.workflowExecutionLog.deleteMany({
            where: { contactWorkflowStateId: { in: stateIds } },
          });
        }

        // Delete contact workflow states
        await tx.contactWorkflowState.deleteMany({
          where: { workflowId: workflowId },
        });

        // Finally, delete the workflow definition
        await tx.workflowDefinition.delete({
          where: { workflowId: workflowId },
        });
      });
      console.log(`Force deleted workflow ${workflowId} and its dependencies.`);

    } else {
      // Standard delete: Check for dependencies first
      const enrolledContactsCount = await prisma.contactWorkflowState.count({
        where: { workflowId: workflowId },
      });

      if (enrolledContactsCount > 0) {
        // Dependencies exist, prevent deletion
        return NextResponse.json(
          {
            error: `Cannot delete workflow because ${enrolledContactsCount} contact(s) are currently enrolled. Use force=true to delete anyway (this will remove contacts from the workflow).`,
            code: 'WORKFLOW_HAS_ENROLLED_CONTACTS'
          },
          { status: 409 } // 409 Conflict is appropriate here
        );
      } else {
        // No dependencies, safe to delete
        await prisma.workflowDefinition.delete({
          where: { workflowId: workflowId },
        });
         console.log(`Deleted workflow ${workflowId} (no enrolled contacts).`);
      }
    }
  } catch (err: any) {
    console.error(`Database delete failed for workflow ${workflowId} (force=${forceDelete}):`, err);
    // Check for Prisma's RecordNotFound error specifically if needed
    if (err.code === 'P2025') { // Prisma code for "Record to delete does not exist."
        return NextResponse.json({ error: "Workflow not found during delete operation" }, { status: 404 });
    }
    return NextResponse.json({ error: "Database delete failed", details: err.message }, { status: 500 });
  }

  // 5. Return success response
  return NextResponse.json({ success: true }, { status: 200 });
}
