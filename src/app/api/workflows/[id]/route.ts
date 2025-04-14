import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

  // 4. Success: return workflow data
  return NextResponse.json(workflow);
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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

  // 4. Delete with raw SQL
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM "WorkflowDefinition"
      WHERE "workflowId" = ${params.id}
    `;

    // Optional: Check if any row was actually deleted
    if (result === 0) {
        // This case might happen if the workflow was deleted between the findUnique and executeRaw calls
        console.warn(`Workflow with ID ${params.id} not found for deletion, though it existed moments ago.`);
        return NextResponse.json({ error: "Workflow not found during delete operation" }, { status: 404 });
    }

  } catch (err) {
    console.error("Database delete failed:", err);
    return NextResponse.json({ error: "Database delete failed" }, { status: 500 });
  }

  // 5. Return success response
  return NextResponse.json({ success: true }, { status: 200 });
}
