'use client';

import React, { useState, useEffect, useCallback } from 'react'; // Removed useRef
import { useParams, useRouter } from 'next/navigation';
import { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowDefinition } from '@prisma/client';
import { Loader2 } from 'lucide-react';

// Shadcn UI for Settings Panel
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"; // Corrected import path if needed, assuming sheet exists
import { Button } from '@/components/ui/button';

// Import our refactored/new components
import { WorkflowBuilder } from '@/components/workflows/WorkflowBuilder';
import { WorkflowStepConfigModal } from '@/components/workflows/WorkflowStepConfigModal';
import { WorkflowEditorHeader } from '@/components/workflows/WorkflowEditorHeader';
import { WorkflowSettings } from '@/components/workflows/WorkflowSettings';
import { ActionChooserModal } from '@/components/workflows/flow/ActionChooserModal'; // Import Action Chooser
import { getDefaultConfigForAction } from '@/components/workflows/flow/workflowActionsConfig'; // Import helper

import {
  WorkflowStep,
  WorkflowMetadataFormData,
  ActionType,
  BranchConfig
} from '@/types/workflow';

// Helper function to fetch workflow data (client-side) - Keep simulation for now
// TODO: Replace with actual API call
async function getWorkflowDefinition(id: string): Promise<(WorkflowDefinition & { steps?: WorkflowStep[] }) | null> {
  console.warn("Direct DB fetch simulation from client component - replace with secure API call");
  // Replace this with your actual API endpoint fetch
  const response = await fetch(`/api/workflows/${id}`); // Example API route
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch workflow: ${response.statusText}`);
  }
  const data = await response.json();

  // --- SIMULATED FETCHED DATA (Fallback if API fails/not implemented) ---
  // const simulatedData: WorkflowDefinition & { steps?: any[] } = {
  //   workflowId: id,
  //   name: `Existing Workflow ${id.substring(0, 4)}`,
  //   description: 'This is an existing workflow description.',
  //   dailyContactLimit: 100,
  //   dripStartTime: new Date('1970-01-01T09:00:00Z'),
  //   dripEndTime: new Date('1970-01-01T17:00:00Z'),
  //   timezone: 'America/Chicago',
  //   organizationId: 'simulated-org-id',
  //   createdAt: new Date(),
  //   updatedAt: new Date(),
  //   isActive: true,
  //   steps: [
  //     { order: 1, actionType: 'wait', config: { duration: 1, unit: 'days' } },
  //     { order: 2, actionType: 'send_email', config: { scenarioId: 'initial-email-scenario' } },
  //     { order: 3, actionType: 'branch', config: { type: 'percentage_split', paths: [
  //       { weight: 60, nextStepOrder: 4 },
  //       { weight: 40, nextStepOrder: 6 }
  //     ]}},
  //     { order: 4, actionType: 'update_field', config: { fieldPath: 'leadStatus', value: 'High Priority' } },
  //     { order: 5, actionType: 'send_email', config: { scenarioId: 'priority-email' } },
  //     { order: 6, actionType: 'update_field', config: { fieldPath: 'leadStatus', value: 'Standard' } },
  //     { order: 7, actionType: 'webhook', config: { url: 'https://webhook.example.com', method: 'POST' } },
  //   ]
  // };
  // const data = simulatedData;
  // --- END SIMULATION ---

  // Parse and add client IDs to steps
  const parsedSteps = (data.steps || []).map((step: any, index: number) => ({
    ...step,
    clientId: uuidv4(), // Ensure client ID for React Flow
    order: step.order ?? index + 1,
    config: step.config || {},
    // Add explicit types to sort parameters
  })).sort((a: { order: number }, b: { order: number }) => a.order - b.order);

  return { ...data, steps: parsedSteps };
}

// Helper to format Prisma Time (DateTime) to HH:mm string
const formatTime = (date: Date | string | null | undefined): string | undefined => {
  if (!date) return undefined;
  const d = new Date(date); // Handle both Date objects and ISO strings
  if (isNaN(d.getTime())) return undefined;
  // Use local time formatting based on the input potentially being just HH:mm
  // If it's a full date, getUTC might be needed depending on how it's stored/retrieved
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  // Check if the input was likely just time, otherwise use UTC if it was a full date
  if (typeof date === 'string' && date.includes('T')) {
      const utcHours = d.getUTCHours().toString().padStart(2, '0');
      const utcMinutes = d.getUTCMinutes().toString().padStart(2, '0');
      return `${utcHours}:${utcMinutes}`;
  }
  return `${hours}:${minutes}`;
};


export default function WorkflowEditPage() {
  const router = useRouter();
  const params = useParams();
  const workflowId = params.workflowId as string;
  const isCreating = workflowId === 'new';

  const [isLoading, setIsLoading] = useState(!isCreating);
  const [isSaving, setIsSaving] = useState(false);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [workflowName, setWorkflowName] = useState(''); // State for header input
  const [initialSettingsData, setInitialSettingsData] = useState<Partial<WorkflowMetadataFormData>>({});

  // State for Step Configuration Modal
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [currentStepData, setCurrentStepData] = useState<Partial<WorkflowStep> | null>(null);

  // Action Chooser Modal state is now managed within WorkflowBuilder
  // const [actionChooserState, setActionChooserState] = useState<{ ... }> ...

  // State for Settings Panel (Sheet)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // State to hold the WorkflowSettings form instance
  const [settingsFormInstance, setSettingsFormInstance] = useState<UseFormReturn<WorkflowMetadataFormData> | null>(null);

  // --- Helper Functions for Steps (largely unchanged) ---

  const generateClientId = () => uuidv4();

  const recalculateOrder = (currentSteps: WorkflowStep[]): WorkflowStep[] => {
    return currentSteps.map((step, index) => ({
      ...step,
      order: index + 1,
    }));
  };

  // Updated handleAddStep to accept actionType (as string from modal) and optional preceding node ID
  const handleAddStep = (actionType: string, afterNodeId?: string) => {
    console.log(`handleAddStep called: actionType=${actionType}, afterNodeId=${afterNodeId}`);
    let insertAtIndex: number;
    let newStepOrder: number;

    if (afterNodeId === 'trigger' || !afterNodeId) {
      // Adding as the first step (after trigger) or if no specific node is given (shouldn't happen with edge click)
      insertAtIndex = 0;
      newStepOrder = 1;
    } else {
      // Find the index and order of the step we're adding after
      const sourceStepIndex = steps.findIndex(step => step.clientId === afterNodeId);
      if (sourceStepIndex === -1) {
        console.error("Source step not found for ID:", afterNodeId);
        toast.error("Could not find the source step to add after.");
        return;
      }
      insertAtIndex = sourceStepIndex + 1;
      newStepOrder = steps[sourceStepIndex].order + 1;
    }

    // Ensure actionType is valid before proceeding (optional but good practice)
    const defaultConfig = getDefaultConfigForAction(actionType as ActionType); // Cast to ActionType if needed by helper
    if (!defaultConfig) {
        console.error(`Invalid action type received: ${actionType}`);
        toast.error(`Invalid action type selected.`);
        return;
    }
    const newStep: WorkflowStep = {
      clientId: generateClientId(),
      actionType: actionType as ActionType, // Store as ActionType
      config: defaultConfig,
      order: newStepOrder, // Temporary order, will be recalculated
    };

    // Create a new steps array with the new step inserted
    let updatedSteps = [...steps];
    updatedSteps.splice(insertAtIndex, 0, newStep);

    // Recalculate order for all steps
    updatedSteps = recalculateOrder(updatedSteps);

    setSteps(updatedSteps);

    // Find the index of the newly added step in the *updated* array for editing
    const newStepIndex = updatedSteps.findIndex(step => step.clientId === newStep.clientId);

    if (newStepIndex !== -1) {
      // Open the config modal for the newly added step
      setCurrentStepData({ ...updatedSteps[newStepIndex] });
      setEditingStepIndex(newStepIndex); // Set index for potential save
      setIsStepModalOpen(true);
    } else {
      console.error("Could not find newly added step to open config modal.");
      toast.error("Step added, but could not open configuration.");
    }
  };

  // handleEdgeAddClick and handleActionSelected are no longer needed here,
  // WorkflowBuilder handles the modal trigger and passes data to handleAddStep.

  const handleEditStep = (index: number) => {
    setCurrentStepData({ ...steps[index] });
    setEditingStepIndex(index);
    setIsStepModalOpen(true);
  };

  const handleDeleteStep = (index: number) => {
    const deletedStep = steps[index];
    const updatedSteps = steps.filter((_, i) => i !== index);

    // Recalculate order first
    let stepsCopy = recalculateOrder(updatedSteps);

    // Update branch paths that point to steps after the deleted one
    stepsCopy = stepsCopy.map(step => {
      if (step.actionType === 'branch') {
        const config = step.config as BranchConfig;
        if (config.type === 'percentage_split' && Array.isArray(config.paths)) {
          const updatedPaths = config.paths.map(path => {
            if (path.nextStepOrder > deletedStep.order) {
              // Decrement order if it pointed after the deleted step
              return { ...path, nextStepOrder: path.nextStepOrder - 1 };
            } else if (path.nextStepOrder === deletedStep.order) {
              // If pointing to the deleted step, point to the *new* step at that order
              // This assumes the next step in sequence takes its place.
              // More robust logic might be needed depending on desired behavior (e.g., point to end?)
              return { ...path, nextStepOrder: deletedStep.order }; // Point to the step that now has this order
            }
            return path;
          });
          return { ...step, config: { ...config, paths: updatedPaths } };
        }
      }
      return step;
    });

    setSteps(stepsCopy);
    toast.info('Step removed.');
  };


  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const newSteps = [...steps];
    const stepToMove = newSteps[index];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const stepToSwapWith = newSteps[swapIndex];

    // Direct order swap
    const oldOrder = stepToMove.order;
    const swapOrder = stepToSwapWith.order;
    stepToMove.order = swapOrder;
    stepToSwapWith.order = oldOrder;

    // Swap positions in the array
    newSteps[index] = stepToSwapWith;
    newSteps[swapIndex] = stepToMove;

    // Update branch path references globally after the swap
    const updatedStepsWithRefs = newSteps.map(step => {
        if (step.actionType === 'branch') {
            const config = step.config as BranchConfig;
            if (config.type === 'percentage_split' && Array.isArray(config.paths)) {
                const updatedPaths = config.paths.map(path => {
                    if (path.nextStepOrder === oldOrder) {
                        return { ...path, nextStepOrder: swapOrder };
                    } else if (path.nextStepOrder === swapOrder) {
                        return { ...path, nextStepOrder: oldOrder };
                    }
                    return path;
                });
                return { ...step, config: { ...config, paths: updatedPaths } };
            }
        }
        return step;
    });


    setSteps(updatedStepsWithRefs.sort((a, b) => a.order - b.order)); // Ensure sorted by order
  };


  const handleSaveStep = (stepData: WorkflowStep) => {
    let updatedSteps;

    if (editingStepIndex !== null) {
      // Update existing step - More explicit merge
      updatedSteps = steps.map((step, index) => {
        if (index === editingStepIndex) {
          // Explicitly merge only actionType and config from modal data (stepData)
          // onto the existing step from the state array. Preserve original clientId.
          return {
            ...step, // Start with the original step from the array
            actionType: stepData.actionType, // Update with actionType from modal
            config: stepData.config,         // Update with config from modal
            clientId: step.clientId,         // Ensure original clientId is kept
            // order might also be in stepData, but recalculateOrder handles it later
          };
        }
        return step; // Return other steps unchanged
      });
      toast.success('Step updated.');
    } else {
      // This case should ideally not be hit if adding always goes through handleAddStep first,
      // which sets up the modal. If it *is* hit, it means the modal was opened without
      // a preceding add action, which is unexpected. Log a warning.
      // --- Removed duplicated 'else' block content here ---
      console.warn("handleSaveStep called without editingStepIndex - unexpected add flow.");
      // Fallback: Add to end (might be incorrect sequence)
      const newStepWithId = {
        ...stepData,
        clientId: generateClientId(),
        order: steps.length + 1, // Simple append order
      };
      updatedSteps = [...steps, newStepWithId];
      toast.success('Step added (fallback).');
    }

    // Recalculate all step orders to ensure consistency after potential manual order changes in modal
    const reorderedSteps = recalculateOrder(updatedSteps.sort((a, b) => a.order - b.order));

    setSteps(reorderedSteps);
    setIsStepModalOpen(false);
    setEditingStepIndex(null);
    setCurrentStepData(null);
  };

  // --- Data Loading Effect ---

  useEffect(() => {
    if (!isCreating) {
      setIsLoading(true);
      const fetchWorkflow = async () => {
        try {
          // Use the actual fetch function now
          const data = await getWorkflowDefinition(workflowId);

          if (data) {
            setWorkflowName(data.name); // Set header name state
            const formattedMetadata = {
              name: data.name, // Keep name here for initial form data
              description: data.description,
              dailyContactLimit: data.dailyContactLimit ?? undefined,
              dripStartTime: formatTime(data.dripStartTime),
              dripEndTime: formatTime(data.dripEndTime),
              timezone: data.timezone,
            };
            setInitialSettingsData(formattedMetadata); // Set data for WorkflowSettings component
            setSteps(data.steps || []);
          } else {
            toast.error('Workflow not found.');
            router.push('/workflows');
          }
        } catch (error) {
          console.error('Failed to fetch workflow:', error);
          toast.error('Failed to load workflow data.');
          // Don't redirect immediately, allow user to see the error
          // router.push('/workflows');
        } finally {
          setIsLoading(false);
        }
      };
      fetchWorkflow();
    } else {
      // Default values for new workflow
      setWorkflowName('');
      setInitialSettingsData({
        name: '', // Start with empty name
        description: '',
        dailyContactLimit: undefined,
        dripStartTime: undefined,
        dripEndTime: undefined,
        timezone: undefined,
      });
      setSteps([]);
      setIsLoading(false); // No loading needed for 'new'
    }
  }, [workflowId, isCreating, router]);

  // --- Unified Save Function ---
  const handleSaveWorkflow = useCallback(async () => {
    setIsSaving(true);

    // Get current settings data from the WorkflowSettings form via state
    if (!settingsFormInstance) {
      toast.error("Settings form instance not ready."); // Updated error message
      setIsSaving(false);
      return;
    }

    // Trigger validation manually if needed, or rely on getValues
    // await settingsFormInstance.trigger(); // Optional: show validation errors in sheet
    const settingsData = settingsFormInstance.getValues();

    // Ensure the name from the header state is included and validated
    if (!workflowName || workflowName.trim() === '') {
        toast.error("Workflow name cannot be empty.");
        setIsSaving(false);
        // Optionally focus the header input
        return;
    }

    const finalSettingsData = {
      ...settingsData,
      name: workflowName.trim(), // Use the trimmed name from the header state
    };

    const apiUrl = isCreating ? '/api/workflows' : `/api/workflows/${workflowId}`;
    const method = isCreating ? 'POST' : 'PUT';

    // Prepare payload: Combine validated settings and steps
    // Remove clientId before sending to backend
    const stepsForPayload = steps.map(({ clientId, ...rest }) => rest);

    const payload = {
      ...finalSettingsData,
      // Ensure nulls are sent correctly if fields are empty
      description: finalSettingsData.description || null,
      dailyContactLimit: finalSettingsData.dailyContactLimit || null,
      dripStartTime: finalSettingsData.dripStartTime || null,
      dripEndTime: finalSettingsData.dripEndTime || null,
      timezone: finalSettingsData.timezone || null,
      steps: stepsForPayload,
    };

    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `Failed to ${isCreating ? 'create' : 'update'} workflow`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) { /* Ignore parsing error */ }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      toast.success(`Workflow successfully ${isCreating ? 'created' : 'updated'}!`);

      if (isCreating && result.workflowId) {
        // If creating, redirect to the new edit page to prevent duplicate creation
        router.replace(`/workflows/${result.workflowId}`); // Use replace to avoid back button issues
      } else if (!isCreating) {
        // If updating, update the initial settings data to reflect saved state
        setInitialSettingsData(finalSettingsData);
        // Optionally refetch or just assume success
      }
      setIsSettingsOpen(false); // Close settings panel on successful save

    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'An unexpected error occurred during save.');
    } finally {
      setIsSaving(false);
    }
  }, [workflowId, isCreating, router, steps, workflowName, settingsFormInstance]); // Updated dependency

  // --- Render Logic ---

  // Show loader only when editing existing and actively loading
  if (isLoading && !isCreating) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading Workflow...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted/40"> {/* Ensure parent takes full height */}
      <WorkflowEditorHeader
        workflowName={workflowName}
        onWorkflowNameChange={setWorkflowName}
        onToggleSettings={() => setIsSettingsOpen(true)}
        onSave={handleSaveWorkflow}
        onCancel={() => router.push('/workflows')}
        isSaving={isSaving}
        isLoading={isLoading}
        isCreating={isCreating}
      />

      {/* Main Content Area - Builder takes remaining space */}
      {/* Added key to WorkflowBuilder to potentially help React Flow re-render on step changes if needed */}
      <div className="flex-1 overflow-hidden p-1 md:p-2"> {/* Reduced padding, builder handles internal */}
        <WorkflowBuilder
          key={steps.map(s => s.clientId).join('-')} // Force re-render on step changes
          steps={steps}
          onAddStep={handleAddStep}
          onEditStep={handleEditStep}
          onDeleteStep={handleDeleteStep}
          onMoveStep={handleMoveStep}
          // Pass the updated onAddStep handler (duplicate removed)
        />
      </div>

      {/* Settings Panel (Sheet) */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent className="sm:max-w-lg w-[90vw] flex flex-col"> {/* Adjust width and make flex column */}
          <SheetHeader className="mb-4"> {/* Reduced margin */}
            <SheetTitle>Workflow Settings</SheetTitle>
            <SheetDescription>
              Configure the general settings for this workflow. Changes are saved when you click the main 'Save Workflow' button.
            </SheetDescription>
          </SheetHeader>
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto pr-6"> {/* Added padding-right for scrollbar */}
            <WorkflowSettings
              initialData={initialSettingsData}
              onFormInstanceReady={setSettingsFormInstance} // Pass the callback
              isParentLoading={isLoading}
              isParentSaving={isSaving}
            />
          </div>
           <SheetFooter className="mt-auto pt-4 border-t">
             <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Close</Button>
             {/* No save button here, handled by header */}
           </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Step Configuration Modal (remains the same) */}
      <WorkflowStepConfigModal
        isOpen={isStepModalOpen}
        onOpenChange={setIsStepModalOpen}
        stepData={currentStepData}
        onSave={handleSaveStep}
        existingSteps={steps}
        editingIndex={editingStepIndex}
      />

      {/* ActionChooserModal is now rendered inside WorkflowBuilder */}
    </div>
  );
}
