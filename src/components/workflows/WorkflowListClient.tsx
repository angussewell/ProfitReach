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
import { Badge, type BadgeProps } from '@/components/ui/badge'; // Import BadgeProps
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
// Import the new DuplicateWorkflowDialog
import { DuplicateWorkflowDialog } from '@/components/workflows/DuplicateWorkflowDialog'; // Corrected import path

// Define the type for the workflow data passed as props
// This should match the type defined in the page component (including statusCounts)
type WorkflowData = {
  workflowId: string;
  name: string;
  description: string | null; // Keep description in type if needed elsewhere, but won't display in table
  isActive: boolean;
  statusCounts: Record<string, number> | null; // Added status counts
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

  // Mappings for Badge Variants and Labels
  const statusVariantMap: Record<string, BadgeProps['variant']> = {
    active: 'default', // Using default (often green-ish or primary) for active
    pending_schedule: 'secondary',
    waiting_delay: 'secondary',
    waiting_scenario: 'secondary',
    completed: 'outline',
    failed: 'destructive',
    errored: 'destructive',
    // Add other statuses as needed
  };

  const statusLabelMap: Record<string, string> = {
    active: 'Active',
    pending_schedule: 'Pending Schedule',
    waiting_delay: 'Waiting Delay',
    waiting_scenario: 'Waiting Scenario',
    completed: 'Completed',
    failed: 'Failed',
    errored: 'Errored',
    // Add other statuses as needed
  };

  // Helper function to render status counts as Badges
  const renderStatusBadges = (counts: Record<string, number> | null) => {
    if (!counts || Object.keys(counts).length === 0) {
      return <span className="text-muted-foreground">-</span>;
    }

    const badges = Object.entries(counts)
      .filter(([_, count]) => count > 0) // Only show statuses with count > 0
      .map(([status, count]) => {
        const variant = statusVariantMap[status] || 'secondary'; // Default to secondary if status not mapped
        const label = statusLabelMap[status] || status; // Use raw status if not mapped
        return (
          <Badge key={status} variant={variant} className="whitespace-nowrap">
            {label}: {count}
          </Badge>
        );
      });

    if (badges.length === 0) {
       return <span className="text-muted-foreground">-</span>; // Handle case where all counts are 0
    }

    return <div className="flex flex-wrap gap-1">{badges}</div>;
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
            {/* Replaced Description with Enrollment Status */}
            <TableHead>Enrollment Status</TableHead> 
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
                {/* Replaced Description cell with Status Counts cell - Now using renderStatusBadges */}
                <TableCell>
                  {renderStatusBadges(workflow.statusCounts)}
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

      {/* Conditionally render the new Duplicate Workflow Modal */}
      {isDuplicateModalOpen && currentWorkflowToDuplicate && (
        <DuplicateWorkflowDialog // Use the new workflow-specific dialog
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          // Pass the workflow data directly to the 'workflow' prop
          workflow={currentWorkflowToDuplicate}
          // Pass the correct refresh function
          refreshWorkflows={refreshWorkflows}
        />
      )}
    </div>
  );
}
