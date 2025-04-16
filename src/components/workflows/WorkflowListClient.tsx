'use client';

import React, { useState, useTransition, useRef } from 'react'; // Removed useContext
import { useOrganization } from '@/contexts/OrganizationContext'; // Import the custom hook
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, MoreVertical, Trash, Copy } from 'lucide-react'; // Added Copy icon
import Link from 'next/link';
import { toast } from 'sonner';
// Assuming a generic duplicate dialog exists or we adapt Scenario one
import { DuplicateScenarioDialog } from '@/components/scenarios/DuplicateScenarioDialog'; // Adapt this path/component if needed

// Define the type for the workflow data passed as props
// This should match the type defined in the page component
type WorkflowData = {
  workflowId: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

interface WorkflowListClientProps {
  initialWorkflows: WorkflowData[];
}

export default function WorkflowListClient({ initialWorkflows }: WorkflowListClientProps) {
  const [workflows, setWorkflows] = useState<WorkflowData[]>(initialWorkflows);
  const [isPending, startTransition] = useTransition();
  const { currentOrganization } = useOrganization(); // Use the custom hook
  const [isDeleting, setIsDeleting] = useState(false);
  const [isForceDeleting, setIsForceDeleting] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowData | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [currentWorkflowToDuplicate, setCurrentWorkflowToDuplicate] = useState<WorkflowData | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Function to open the duplicate modal
  const handleOpenDuplicateModal = (workflow: WorkflowData) => {
    setCurrentWorkflowToDuplicate(workflow);
    setIsDuplicateModalOpen(true);
  };

  // Placeholder for refresh logic - replace with actual refresh mechanism if different
  const refreshWorkflows = () => {
    // In a real app, this would likely re-fetch data or use SWR mutate
    console.log("Refreshing workflows list...");
    // Example: window.location.reload(); // Simple but not ideal UX
    // Or trigger a re-fetch if using a data fetching hook
  };


  const handleStatusChange = async (workflowId: string, newStatus: boolean) => {
    // Optimistic update for good UX
    setWorkflows((prevWorkflows) =>
      prevWorkflows.map((wf) =>
        wf.workflowId === workflowId ? { ...wf, isActive: newStatus } : wf
      )
    );

    try {
      const orgId = currentOrganization?.id; // Get org ID

      if (!orgId) {
        console.error('Organization ID not found, cannot update workflow status.');
        toast.error('Error: Organization context is missing.');
        // Revert optimistic update if orgId is missing
        setWorkflows((prevWorkflows) =>
          prevWorkflows.map((wf) =>
            wf.workflowId === workflowId ? { ...wf, isActive: !newStatus } : wf
          )
        );
        return; // Stop execution if orgId is missing
      }
      
      // Use the correct URL including orgId
      const response = await fetch(`/api/workflows/${orgId}/${workflowId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newStatus }),
      });

      // Safely handle API response
      let result;
      try {
        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          throw new Error('Server returned non-JSON response');
        }
      } catch (parseError) {
        throw new Error(`Failed to parse server response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      // Check response success
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to update workflow status: ${response.statusText}`);
      }

      toast.success(`Workflow status updated successfully.`);

    } catch (error) {
      console.error('Error updating workflow status:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Revert optimistic update on failure
      setWorkflows((prevWorkflows) =>
        prevWorkflows.map((wf) =>
          wf.workflowId === workflowId ? { ...wf, isActive: !newStatus } : wf
        )
      );
    }
  };

  const truncateDescription = (text: string | null, maxLength: number = 100) => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleDeleteWorkflow = async (forceDelete = false) => {
    if (!workflowToDelete) return;
    
    const workflowId = workflowToDelete.workflowId;
    setIsDeleting(true);

    // Optimistic update - remove from UI immediately
    setWorkflows((prevWorkflows) => 
      prevWorkflows.filter((wf) => wf.workflowId !== workflowId)
    );

    try {
      const url = forceDelete 
        ? `/api/workflows/${workflowId}?force=true`
        : `/api/workflows/${workflowId}`;
        
      const response = await fetch(url, {
        method: 'DELETE',
      });

      let result;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          throw new Error('Server returned non-JSON response');
        }
      } catch (parseError) {
        throw new Error(`Failed to parse server response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      if (!response.ok) {
        throw new Error(result.error || `Failed to delete workflow: ${response.statusText}`);
      }

      toast.success(`Workflow "${workflowToDelete.name}" deleted successfully.`);
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Revert optimistic update on failure
      setWorkflows((prevWorkflows) => [...prevWorkflows, workflowToDelete]);
    } finally {
      setIsDeleting(false);
      setWorkflowToDelete(null);
    }
  };

  return (
    <div className="border-2 border-neutral-300 rounded-lg shadow-sm overflow-hidden">
      {/* Delete confirmation dialog */}
      {/* Standard delete confirmation dialog */}
      <AlertDialog 
        open={workflowToDelete !== null && !isForceDeleting} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setWorkflowToDelete(null);
            setIsForceDeleting(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete workflow '{workflowToDelete?.name}'? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel ref={cancelButtonRef} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDeleteWorkflow(false)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force delete confirmation dialog */}
      <AlertDialog 
        open={workflowToDelete !== null && isForceDeleting} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setWorkflowToDelete(null);
            setIsForceDeleting(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Delete Test Workflow</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div>You are about to force delete '{workflowToDelete?.name}', which appears to be a test workflow.</div>
              <div>Force deletion bypasses standard ID validation and should only be used for test workflows that cannot be deleted normally.</div>
              <div className="font-semibold text-amber-600">This action cannot be undone.</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel ref={cancelButtonRef} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDeleteWorkflow(true)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Force Deleting...' : 'Force Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[100px] text-center">Status</TableHead>
            <TableHead className="w-[100px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workflows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No workflows found.
              </TableCell>
            </TableRow>
          ) : (
            workflows.map((workflow) => (
              <TableRow key={workflow.workflowId}>
                <TableCell className="font-medium">{workflow.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {truncateDescription(workflow.description)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={workflow.isActive ? 'default' : 'outline'}
                         className={workflow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                  >
                    {workflow.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Switch
                      checked={workflow.isActive}
                      onCheckedChange={(newStatus) => {
                        startTransition(() => {
                          handleStatusChange(workflow.workflowId, newStatus);
                        });
                      }}
                      disabled={isPending}
                      aria-label={`Toggle status for ${workflow.name}`}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu for {workflow.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/workflows/${workflow.workflowId}`} passHref>
                          <DropdownMenuItem className="cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem 
                          className="cursor-pointer"
                          onClick={() => {
                            setIsForceDeleting(false);
                            setWorkflowToDelete(workflow);
                          }}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                        {/* Duplicate Menu Item */}
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onSelect={(e) => e.preventDefault()} // Prevent closing menu immediately
                          onClick={() => handleOpenDuplicateModal(workflow)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          <span>Duplicate</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:bg-red-50 cursor-pointer"
                          onClick={() => {
                            setIsForceDeleting(true);
                            setWorkflowToDelete(workflow);
                          }}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Force Delete (Test)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Conditionally render the Duplicate Modal */}
      {isDuplicateModalOpen && currentWorkflowToDuplicate && (
        <DuplicateScenarioDialog // Use the actual generic/adapted dialog component
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          // Pass workflow data mapped to the 'scenario' prop structure
          scenario={{ id: currentWorkflowToDuplicate.workflowId, name: currentWorkflowToDuplicate.name }}
          // The DuplicateScenarioDialog needs modification or replacement to handle different entity types/endpoints
          // For now, this will pass the correct ID/Name, but the API call inside the dialog might be wrong.
          // We will address the dialog's internal logic if needed in a later step.
          refreshScenarios={refreshWorkflows} // Assuming this prop triggers refresh
        />
      )}
    </div>
  );
}
