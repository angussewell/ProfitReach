import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    console.log('Server-side: Fetching workflows for Org ID:', organizationId);
    
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
    console.log('Server-side: Found workflows:', workflows.length);
    return workflows;
  } catch (error) {
    console.error('Error fetching workflows:', error);
    // Log the full error details for debugging
    console.error('Detailed error:', JSON.stringify(error, null, 2));
    return [];
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
            <Button>Create Workflow</Button>
          </Link>
        </div>
        <div className="p-8 text-center border rounded-lg">
          <p className="text-red-500">Unable to load workflows: Authentication issue</p>
          <p className="text-gray-500 mt-2">Please try logging out and back in.</p>
        </div>
      </PageContainer>
    );
  }
  
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
