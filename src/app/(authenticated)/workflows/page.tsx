import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import WorkflowListClient from '@/components/workflows/WorkflowListClient'; // Import the client component
import { PageContainer } from '@/components/layout/PageContainer'; // Import the standard container

// Define the type for the fetched workflow data, including status counts
type WorkflowData = {
  workflowId: string;
  name: string;
  description: string | null; // Keep description for now, might be useful elsewhere
  isActive: boolean;
  statusCounts: Record<string, number> | null; // Added status counts
};

async function getWorkflows(organizationId: string): Promise<WorkflowData[]> {
  try {
    console.log('Server-side: Fetching workflows for Org ID:', organizationId);

    // 1. Fetch base workflow definitions
    const baseWorkflows = await prisma.workflowDefinition.findMany({
      where: {
        organizationId: organizationId,
      },
      select: {
        workflowId: true,
        name: true,
        description: true,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log('Server-side: Found base workflows:', baseWorkflows.length);

    if (baseWorkflows.length === 0) {
      return []; // No workflows, return empty array early
    }

    // 2. Get workflow IDs
    const workflowIds = baseWorkflows.map(wf => wf.workflowId);

    // 3. Fetch status counts using groupBy
    const statusCountsResult = await prisma.contactWorkflowState.groupBy({
      by: ['workflowId', 'status'],
      _count: {
        status: true, // Count occurrences of each status
      },
      where: {
        organizationId: organizationId,
        workflowId: {
          in: workflowIds,
        },
      },
    });
    console.log('Server-side: Fetched status counts:', statusCountsResult.length);

    // 4. Process groupBy results into a usable map
    const statusCountsMap = new Map<string, Record<string, number>>();
    statusCountsResult.forEach(item => {
      if (!statusCountsMap.has(item.workflowId)) {
        statusCountsMap.set(item.workflowId, {});
      }
      statusCountsMap.get(item.workflowId)![item.status] = item._count.status;
    });
    console.log('Server-side: Processed status counts map:', statusCountsMap.size);

    // 5. Merge status counts into the workflow data
    const workflowsWithCounts: WorkflowData[] = baseWorkflows.map(wf => ({
      ...wf,
      statusCounts: statusCountsMap.get(wf.workflowId) || null, // Assign counts or null
    }));

    console.log('Server-side: Returning workflows with counts:', workflowsWithCounts.length);
    return workflowsWithCounts;

  } catch (error) {
    console.error('Error fetching workflows with counts:', error);
    // Log the full error details for debugging
    console.error('Detailed error:', JSON.stringify(error, null, 2));
    return []; // Return empty array on error
  }
}

export default async function WorkflowsPage() {
  // Get the actual organization ID from the session
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;
  
  if (!organizationId) {
    console.error('No organization ID found in session. User may not be properly authenticated.');
    return (
      <PageContainer>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Workflows</h1>
          <Link href="/workflows/new" passHref>
            <Button variant="default" size="default">Create Workflow</Button> {/* Apply default variant and size */}
          </Link>
        </div>
        <div className="p-8 text-center border rounded-lg">
          <p className="text-red-500">Unable to load workflows: Authentication issue</p>
          <p className="text-gray-500 mt-2">Please try logging out and back in.</p>
        </div>
      </PageContainer>
    );
  }
  // Fetch workflows with the updated function
  const workflows = await getWorkflows(organizationId);

  return (
    // Use the standard PageContainer for consistent layout
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Workflows</h1>
        <Link href="/workflows/new" passHref>
          <Button variant="default" size="default">Create Workflow</Button> {/* Apply default variant and size */}
        </Link>
      </div>

      {/* Render the client component with the fetched data */}
      <WorkflowListClient initialWorkflows={workflows} />
    </PageContainer>
  );
}

// Optional: Add metadata for the page
export const metadata = {
  title: 'Workflows',
  description: 'Manage your automated workflows.',
};
