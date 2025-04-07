import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import WorkflowListClient from '@/components/workflows/WorkflowListClient'; // Import the client component
import { PageContainer } from '@/components/layout/PageContainer'; // Import the standard container

// Define the type for the fetched workflow data
type WorkflowData = {
  workflowId: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

async function getWorkflows(organizationId: string): Promise<WorkflowData[]> {
  try {
    const workflows = await prisma.workflowDefinition.findMany({
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
        createdAt: 'desc', // Or 'name', 'asc' etc. depending on desired default sort
      },
    });
    return workflows;
  } catch (error) {
    console.error('Error fetching workflows:', error);
    // In a real app, you might want to throw the error or handle it differently
    return [];
  }
}

export default async function WorkflowsPage() {
  // TODO: Replace with actual organizationId from session/auth context
  const organizationId = 'org_test_alpha';
  const workflows = await getWorkflows(organizationId);

  return (
    // Use the standard PageContainer for consistent layout
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Workflows</h1>
        <Link href="/workflows/new" passHref>
          <Button>Create Workflow</Button>
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
