'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
// Bug, AlertTriangle removed
import { WorkflowStep, ActionType } from '@/types/workflow';
// DebugDisplay, ActionChooserModal removed
import { WorkflowStepsView } from './WorkflowStepsView'; // Will render the vertical list
import { WorkflowStepConfigModal } from './WorkflowStepConfigModal';
import { useWorkflowState } from './hooks/useWorkflowState';
import { getDefaultConfigForAction } from './utils/workflowUtils'; // Import helper

// Updated Props to include stepCounts
interface WorkflowBuilderProps {
  workflowId: string;
  steps: WorkflowStep[];
  stepCounts?: Record<number, number>; // Add stepCounts prop
  onSaveChanges?: (steps: WorkflowStep[]) => void;
}

export function WorkflowBuilder({
  workflowId,
  steps: initialSteps,
  stepCounts = {}, // Destructure stepCounts with default value
  onSaveChanges,
}: WorkflowBuilderProps) {
  // Pass workflowId to the hook
  const {
    steps,
    addStep,
    updateStep,
    deleteStep,
    moveStep,
    setSteps // Keep setSteps if needed externally, though maybe not
  } = useWorkflowState(initialSteps, workflowId); // Pass workflowId

  // State for managing the action modal (REMOVED)
  // const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [addingAfterIndex, setAddingAfterIndex] = useState<number>(-1); // Keep track of where to insert
  // addingToPathIndex removed

  // State for the step configuration modal
  const [isStepConfigModalOpen, setIsStepConfigModalOpen] = useState(false);
  const [currentStepData, setCurrentStepData] = useState<Partial<WorkflowStep> | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  // Ref for latest steps to avoid stale closures in onSaveChanges callback
  const latestStepsRef = useRef<WorkflowStep[]>([]);

  // useEffect managing initialSteps is now handled within useWorkflowState hook

  // Keep a ref to latest steps for callbacks
  useEffect(() => {
    latestStepsRef.current = steps;
  }, [steps]);

  // Logging for debugging state issues (branch logic removed)
  useEffect(() => {
    console.log('WorkflowBuilder: Steps data updated:', JSON.stringify(steps, null, 2));
  }, [steps]);

  // Simplified handler for adding a step (triggered by AddStepButton in WorkflowStepsView)
  // We'll add a default 'wait' step for now, then immediately open the config modal
  const handleAddStep = (index: number) => {
    const defaultActionType: ActionType = 'wait'; // Or choose another default
    console.log(`Adding step after index: ${index}`);
    addStep(defaultActionType, index);

    // Open the config modal for the newly added step after state update
    // Use setTimeout to allow state to propagate before finding the new step
    setTimeout(() => {
      const newStepIndex = index + 1;
      if (newStepIndex >= 0 && newStepIndex < latestStepsRef.current.length) {
        console.log(`Opening config modal for new step at index: ${newStepIndex}`);
        handleEditStep(newStepIndex); // Open modal for the new step
      } else {
        console.error(`Could not find new step at index ${newStepIndex} after adding.`);
      }
    }, 0);
  };

  // Handler for opening the config modal to edit an existing step
  const handleEditStep = (index: number) => {
    // Use latestStepsRef to ensure we get the most up-to-date step data
    const currentSteps = latestStepsRef.current;
    if (index >= 0 && index < currentSteps.length) {
      // Create a deep clone for editing
      const stepData = JSON.parse(JSON.stringify(currentSteps[index]));
      setCurrentStepData(stepData);
      setEditingStepIndex(index);
      setIsStepConfigModalOpen(true);
    } else {
      console.error(`handleEditStep: Invalid index ${index}`);
    }
  };

  // Handler for saving step configuration from the modal
  const handleSaveStep = (stepData: WorkflowStep) => {
    console.log("handleSaveStep called with data:", JSON.stringify(stepData, null, 2));
    updateStep(stepData); // Update state using the hook

    // Call the onSaveChanges callback AFTER state update
    if (onSaveChanges) {
      // Use setTimeout to allow state update before calling save
      setTimeout(() => {
        onSaveChanges(latestStepsRef.current);
      }, 0);
    }

    // Close the modal
    setIsStepConfigModalOpen(false);
    setCurrentStepData(null);
    setEditingStepIndex(null);
  };

  // Handler for deleting a step (passed to WorkflowStepsView -> StepCard)
  const handleDeleteStep = (index: number) => {
    deleteStep(index); // Update state using the hook

    // Call the onSaveChanges callback AFTER state update
    if (onSaveChanges) {
      setTimeout(() => {
        onSaveChanges(latestStepsRef.current);
      }, 0);
    }
  };

  // Handler for moving a step (passed to WorkflowStepsView -> StepCard)
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    moveStep(index, direction); // Update state using the hook

    // Call the onSaveChanges callback AFTER state update
    if (onSaveChanges) {
      setTimeout(() => {
        onSaveChanges(latestStepsRef.current);
      }, 0);
    }
  };

  return (
    <> {/* Wrap in Fragment to include Modals outside the main layout */}
      <div className="flex flex-col bg-gray-50 border border-gray-100 rounded-lg h-full overflow-auto">
        {/* Simplified Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-sm font-medium text-muted-foreground">Workflow Steps ({steps.length})</h3>
        </div>

        {/* Debug Display Removed */}

        {/* Main Workflow View - Renders the vertical list */}
        <div className="flex-grow overflow-auto p-4"> {/* Added padding */}
          <WorkflowStepsView
            steps={steps}
            onAddStep={handleAddStep} // Pass the simplified add handler
            // onAddFirstStep removed, handled by initial AddStepButton in WorkflowStepsView
            onEditStep={handleEditStep}
            onDeleteStep={handleDeleteStep}
            onMoveStep={handleMoveStep}
            stepCounts={stepCounts} // Pass stepCounts down to WorkflowStepsView
          />
        </div>
      </div>

      {/* Action Chooser Modal Removed */}

      {/* Step Configuration Modal - Remains the same */}
      <WorkflowStepConfigModal
        isOpen={isStepConfigModalOpen}
        onOpenChange={(open) => {
          setIsStepConfigModalOpen(open);
          if (!open) {
            // Reset state if the modal is closed without saving
            setCurrentStepData(null);
            setEditingStepIndex(null);
          }
        }}
        stepData={currentStepData}
        onSave={handleSaveStep}
        existingSteps={steps}
        editingIndex={editingStepIndex}
      />
    </>
  );
}
