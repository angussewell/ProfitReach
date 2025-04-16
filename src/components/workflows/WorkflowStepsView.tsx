'use client';

import React from 'react';
// BranchConfig removed
import { WorkflowStep } from '@/types/workflow';
import { TriggerNode } from './TriggerNode'; // Keep TriggerNode
import { StepCard } from './StepCard'; // Keep StepCard
// PathIndicator removed
import { AddStepButton } from './AddStepButton'; // Keep AddStepButton

// Branch analysis helpers removed

// Simplified props
interface WorkflowStepsViewProps {
  steps: WorkflowStep[];
  onAddStep: (afterIndex: number) => void; // Simplified signature
  // onAddFirstStep removed
  onEditStep: (index: number) => void;
  onDeleteStep: (index: number) => void;
  onMoveStep: (index: number, direction: 'up' | 'down') => void;
  stepCounts?: Record<number, number>; // Add stepCounts prop
}

/**
 * Renders workflow steps as a simple vertical list.
 */
export function WorkflowStepsView({
  steps,
  onAddStep,
  // onAddFirstStep removed
  onEditStep,
  onDeleteStep,
  onMoveStep,
  stepCounts = {} // Destructure stepCounts with default
}: WorkflowStepsViewProps) {

  // No complex path analysis needed

  return (
    // Enhanced container with better horizontal centering
    <div className="flex flex-col items-center justify-center w-full mx-auto max-w-md"> {/* Added max-w-md to the parent for better centering */}
      {/* Trigger Node - Always shown */}
      <div className="w-full mb-2"> {/* Added consistent bottom margin */}
        <TriggerNode />
      </div>

      {/* Add Step Button below Trigger */}
      <div className="w-full"> {/* Removed max-w-md as it's now on the parent */}
        <AddStepButton
          onClick={() => onAddStep(-1)} // Add after trigger (index -1)
          showVerticalLine={steps.length > 0} // Show line only if steps exist below
          className="mx-auto" // Center the button itself
        />
      </div>

      {/* Render Steps Vertically */}
      {steps.map((step, index) => (
        <React.Fragment key={step.clientId}>
          {/* Step Card */}
          <div className="w-full"> {/* Removed max-w-md as it's now on the parent */}
            <StepCard
              step={step}
              isFirst={index === 0}
              isLast={index === steps.length - 1}
              contactCount={stepCounts[step.order] || 0} // Pass the count for this step's order
              // indentLevel removed
              index={index}
              allSteps={steps} // Pass all steps for context if needed (e.g., move validation)
              onEdit={onEditStep}
              onDelete={onDeleteStep}
              // Adjust calls to pass only the index and direction implicitly
              onMoveUp={() => onMoveStep(index, 'up')}
              onMoveDown={() => onMoveStep(index, 'down')}
            />
          </div>

          {/* Add Step Button After Each Step (unless it's 'remove_from_workflow') */}
          {step.actionType !== 'remove_from_workflow' && (
            <div className="w-full"> {/* Removed max-w-md as it's now on the parent */}
               <AddStepButton
                 onClick={() => onAddStep(index)} // Add after current step index
                 showVerticalLine={index < steps.length - 1 || steps[index+1]?.actionType !== 'remove_from_workflow'} // Show line unless it's the very last button
                 className="mx-auto" // Center the button itself
               />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
