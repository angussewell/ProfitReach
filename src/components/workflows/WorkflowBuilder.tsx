'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MoveVertical, Bug, AlertTriangle } from 'lucide-react';
import { WorkflowStep } from '@/types/workflow';
import WorkflowFlow from './flow/WorkflowFlow';
import DebugDisplay from './flow/DebugDisplay';
import { ActionChooserModal } from './flow/ActionChooserModal'; // Correct: Named import
import { WORKFLOW_ACTIONS_CONFIG } from './flow/workflowActionsConfig'; // Correct: Use exported name

interface WorkflowBuilderProps {
  steps: WorkflowStep[];
  // Update onAddStep signature to accept actionType, optional preceding node ID, and optional source handle ID
  onAddStep: (actionType: string, afterNodeId?: string, sourceHandleId?: string) => void;
  onEditStep: (index: number) => void;
  onDeleteStep: (index: number) => void;
  onMoveStep: (index: number, direction: 'up' | 'down') => void;
  // No longer need onEdgeAddClick prop here, WorkflowFlow handles triggering the local handler
}

export function WorkflowBuilder({
  steps,
  onAddStep, // Use updated signature
  onEditStep,
  onDeleteStep,
  onMoveStep,
  // onEdgeAddClick is removed
}: WorkflowBuilderProps) {
  // Debug state
  const [showDebug, setShowDebug] = useState(false);
  // State for managing the ActionChooserModal
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [addingAfterNodeId, setAddingAfterNodeId] = useState<string | undefined>(undefined);
  const [addingFromHandleId, setAddingFromHandleId] = useState<string | undefined>(undefined); // Add state for handle ID
  
  // Debug log to track steps in the builder
  useEffect(() => {
    console.log('WorkflowBuilder - steps updated:', steps);
  }, [steps]);
  
  // Removed the conditional rendering for steps.length === 0.
  // The WorkflowFlow component will now always render, 
  // and flowTransformers ensures the Trigger node is always present.
  // The TriggerNode itself handles showing the '+' button when needed.

  // Create a "stepIndexMap" that maps clientId to index for easy lookup
  const stepIndexMap = new Map<string, number>();
  steps.forEach((step, index) => {
    stepIndexMap.set(step.clientId, index);
  });

  // Handler triggered by the "+" button on nodes
  const handleAddStepClick = (sourceNodeId: string, sourceHandleId?: string) => {
    console.log('handleAddStepClick triggered for:', { sourceNodeId, sourceHandleId });
    setAddingAfterNodeId(sourceNodeId); // Store the ID of the node we're adding after
    setAddingFromHandleId(sourceHandleId); // Store the specific handle ID (for branches)
    setIsActionModalOpen(true); // Open the modal
  };

  // Handler for when an action is selected in the modal
  const handleActionSelected = (actionType: string) => {
    console.log(`Action selected: ${actionType}, adding after node: ${addingAfterNodeId}, from handle: ${addingFromHandleId}`);
    // Pass actionType, nodeId, and handleId to the parent's add function
    // The parent function needs to be updated to accept sourceHandleId if needed for its logic
    onAddStep(actionType, addingAfterNodeId, addingFromHandleId); 
    setIsActionModalOpen(false); // Close modal
    setAddingAfterNodeId(undefined); // Reset state
    setAddingFromHandleId(undefined); // Reset state
    // Note: Opening the config modal for the new step should happen in the parent
    // component after the steps state is updated and potentially uses the handleId.
  };

  const handleStepEdit = (index: number) => {
    onEditStep(index);
  };

  const handleStepDelete = (index: number) => {
    onDeleteStep(index);
  };

  return (
    <> {/* Wrap in Fragment to include Modal */}
      <div className="flex flex-col bg-gray-50 border border-gray-100 rounded-lg h-full"> {/* Ensure builder takes height */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0"> {/* Header */}
          <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">Workflow Steps ({steps.length})</h3>
          {steps.length > 0 && !showDebug && (
            <button
              onClick={() => setShowDebug(true)}
              className="text-amber-500 hover:text-amber-700"
              title="Show debug view"
            >
              <AlertTriangle size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {showDebug && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebug(false)}
              className="gap-1 border-red-200 text-red-700 hover:bg-red-50"
            >
              <Bug className="h-4 w-4" /> Hide Debug View
            </Button>
          )}
          {/* Removed the header Add Step button */}
          {/* <Button 
            variant="outline" 
            size="sm"
            onClick={() => onAddStep()}
            className="gap-1"
          >
            <Plus className="h-4 w-4" /> Add Step
          </Button> */}
        </div>
      </div>
      
      {/* Debug Display */}
      <DebugDisplay steps={steps} visible={showDebug} />

      {/* React Flow workflow visualization - ensure it fills available space */}
      <div className="flex-grow p-1 relative"> {/* Added relative for potential absolute positioning inside */}
        <WorkflowFlow
          key={`workflow-flow-${steps.map(s => s.clientId).join('-')}`}
          steps={steps}
          onStepEdit={handleStepEdit}
          onStepDelete={handleStepDelete}
          onAddStepClick={handleAddStepClick} // Pass the correct handler
          className="rounded-md h-full w-full" // Ensure flow takes full space
        />
      </div>

      {/* Additional controls */}
      <div className="p-4 border-t border-gray-200 flex justify-between flex-shrink-0"> {/* Footer */}
        <div className="text-xs text-muted-foreground">
          <span className="bg-gray-100 rounded px-2 py-1 inline-flex items-center gap-1">
            <MoveVertical className="h-3 w-3" /> 
            Pan: Drag canvas | Zoom: Scroll wheel
          </span>
        </div>
        {/* Removed the footer Add Step button */}
        {/* <Button 
          variant="outline" 
          size="sm"
          onClick={() => onAddStep()}
          className="gap-1"
        >
          <Plus className="h-4 w-4" /> Add Step
        </Button> */}
      </div>
    </div>

    {/* Action Chooser Modal */}
    <ActionChooserModal
        isOpen={isActionModalOpen}
        onOpenChange={(open) => {
          setIsActionModalOpen(open);
          if (!open) {
            // Reset state if the modal is closed without selection
            setAddingAfterNodeId(undefined);
            setAddingFromHandleId(undefined);
          }
        }}
        onSelectAction={handleActionSelected}
        // actionsConfig is not a prop of ActionChooserModal
      />
    </>
  );
}
