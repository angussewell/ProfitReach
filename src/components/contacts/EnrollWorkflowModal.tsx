'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { FilterState } from '@/types/filters'; // Assuming FilterState type is defined here

interface ActiveWorkflow {
  workflowId: string;
  name: string;
}

interface SelectedContactsData {
  contactIds?: string[];
  isSelectAllMatchingActive?: boolean;
  filters?: FilterState;
  searchTerm?: string;
}

interface EnrollWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: SelectedContactsData;
  onEnrollmentComplete: () => void;
}

export function EnrollWorkflowModal({
  isOpen,
  onClose,
  selectedContacts,
  onEnrollmentComplete,
}: EnrollWorkflowModalProps) {
  const [activeWorkflows, setActiveWorkflows] = useState<ActiveWorkflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const fetchActiveWorkflows = useCallback(async () => {
    if (!isOpen) return; // Don't fetch if modal is closed

    setIsLoadingWorkflows(true);
    try {
      const response = await fetch('/api/workflows?active=true');
      if (!response.ok) {
        throw new Error('Failed to fetch active workflows');
      }
      
      // Log raw response for debugging
      const responseData = await response.json();
      console.log('EnrollModal: Received API Response Data:', responseData);
      
      // Extract the actual workflows array from the response
      const workflows = responseData.data || [];
      console.log('EnrollModal: Extracted workflows:', workflows);
      
      setActiveWorkflows(workflows);
      // Reset selection when workflows are reloaded
      setSelectedWorkflowId(null);
    } catch (error) {
      console.error('Error fetching active workflows:', error);
      toast.error('Could not load workflows. Please try again.');
      setActiveWorkflows([]); // Clear workflows on error
    } finally {
      setIsLoadingWorkflows(false);
    }
  }, [isOpen]);

  // Fetch workflows when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchActiveWorkflows();
    }
  }, [isOpen, fetchActiveWorkflows]);

  const handleEnrollConfirm = async () => {
    if (!selectedWorkflowId) {
      toast.error('Please select a workflow.');
      return;
    }

    setIsEnrolling(true);
    const toastId = toast.loading('Enrolling contacts...');

    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: selectedWorkflowId,
          ...selectedContacts, // Spread the selection data (contactIds or filters/search)
        }),
      });

      // Safely handle various error scenarios
      let result;
      try {
        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          // Handle non-JSON responses gracefully
          const textResponse = await response.text();
          throw new Error(`Server returned non-JSON response: ${textResponse.substring(0, 100)}${textResponse.length > 100 ? '...' : ''}`);
        }
      } catch (parseError) {
        // Handle JSON parsing errors
        throw new Error(`Failed to parse server response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      }

      // Check response status and structure
      if (!response.ok) {
        throw new Error(result?.error || `Enrollment failed with status ${response.status}: ${response.statusText}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Enrollment failed with an unknown error');
      }

      // Success handling
      const enrolledCount = result.data?.enrolledCount || 'selected';
      toast.success(`Successfully enrolled ${enrolledCount} contacts.`, { id: toastId });
      onEnrollmentComplete(); // Callback to potentially clear selection, etc.
      onClose(); // Close the modal on success

    } catch (error) {
      console.error('Enrollment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(`Enrollment failed: ${errorMessage}`, { id: toastId });
    } finally {
      setIsEnrolling(false);
    }
  };

  const getSelectedCount = () => {
    if (selectedContacts.isSelectAllMatchingActive) {
      return 'all matching';
    }
    return selectedContacts.contactIds?.length || 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enroll Contacts in Workflow</DialogTitle>
          <DialogDescription>
            Select an active workflow to enroll the selected {getSelectedCount()} contacts into.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoadingWorkflows ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading workflows...
            </div>
          ) : activeWorkflows.length > 0 ? (
            <Select
              onValueChange={setSelectedWorkflowId}
              value={selectedWorkflowId ?? undefined} // Handle null state for Select
              disabled={isEnrolling}
            >
              <SelectTrigger className="bg-white text-foreground">
                <SelectValue placeholder="Select a workflow..." />
              </SelectTrigger>
              <SelectContent className="bg-white text-foreground">
                {activeWorkflows.map((wf) => (
                  <SelectItem key={wf.workflowId} value={wf.workflowId}>
                    {wf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              No active workflows found. Please create and activate a workflow first.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="default" onClick={onClose} disabled={isEnrolling}>
            Cancel
          </Button>
          <Button
            variant="default" // Explicitly set primary variant
            size="default" // Explicitly set standard size
            onClick={handleEnrollConfirm}
            disabled={!selectedWorkflowId || isLoadingWorkflows || isEnrolling || activeWorkflows.length === 0}
          >
            {isEnrolling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enrolling...
              </>
            ) : (
              'Confirm Enrollment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
