'use client';

import { useReducer, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// BranchConfig removed from import
import { WorkflowStep, ActionType, StepConfig } from '@/types/workflow';
// Import path adjusted as flow directory is removed
import { getDefaultConfigForAction } from '@/components/workflows/utils/workflowUtils'; // Adjusted import path

// --- Helper Functions ---

/**
 * Creates a deep clone of an object. Essential for immutable updates.
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  // Basic deep clone for JSON-serializable objects
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error("Deep clone failed:", e);
    // Fallback or throw error depending on requirements
    return obj; // Or handle more gracefully
  }
}

/**
 * Recalculates the 'order' property for all steps based on their array index.
 * Ensures 'order' is always sequential and correct (1-based index).
 */
function recalculateStepOrder(steps: WorkflowStep[]): WorkflowStep[] {
  return steps.map((step, index) => ({
    ...step,
    order: index + 1, // Order is 1-based
  }));
} // <-- Added missing closing brace

// isBranchConfig and updateReferencesAfterDelete functions removed

// --- Reducer Logic ---

type WorkflowAction =
  | { type: 'SET_STEPS'; payload: { steps: WorkflowStep[] } }
  // branchPath removed from ADD_STEP payload
  | { type: 'ADD_STEP'; payload: { actionType: ActionType; insertAfterIndex: number } }
  | { type: 'UPDATE_STEP'; payload: { step: WorkflowStep } } // Use clientId to find and update
  | { type: 'DELETE_STEP'; payload: { index: number } }
  | { type: 'MOVE_STEP'; payload: { index: number; direction: 'up' | 'down' } };

function workflowReducer(state: WorkflowStep[], action: WorkflowAction): WorkflowStep[] {
  console.log(`%cWorkflowReducer Action: ${action.type}`, 'color: blue; font-weight: bold;', action.payload);
  console.log("State BEFORE action:", deepClone(state)); // Log state before change

  let newState: WorkflowStep[];

  switch (action.type) {
    case 'SET_STEPS':
      // Directly set the steps, ensuring they are cloned and ordered
      newState = recalculateStepOrder(deepClone(action.payload.steps));
      break;

    case 'ADD_STEP': {
      // branchPath removed from destructuring
      const { actionType, insertAfterIndex } = action.payload;
      const clonedState = deepClone(state); // Clone current state

      // Create the new step with type-safe config
      let defaultConfig = deepClone(getDefaultConfigForAction(actionType) || {});
      
      // Ensure webhook URL is always a string (fix for the numeric 1 bug)
      if (actionType === 'webhook' && typeof defaultConfig === 'object') {
        // Type assertion for webhook config
        const webhookConfig = defaultConfig as { url?: any; method?: any };
        defaultConfig = {
          ...defaultConfig,
          url: String(webhookConfig.url || ''),
          method: String(webhookConfig.method || 'POST')
        };
      }
      
      const newStep: WorkflowStep = {
        clientId: uuidv4(), // Generate unique client-side ID
        actionType: actionType,
        config: defaultConfig as StepConfig | {},
        order: -1, // Placeholder, will be recalculated
        customName: '', // Initialize customName
      };

      // Determine insertion point
      const insertAt = insertAfterIndex + 1;
      clonedState.splice(insertAt, 0, newStep); // Insert the new step immutably (on the cloned array)

      // --- Automatic Branch Linking Removed ---

      // Recalculate order for the entire new array
      newState = recalculateStepOrder(clonedState);
      break;
    }

    case 'UPDATE_STEP': {
      const updatedStepData = deepClone(action.payload.step); // Clone incoming data
      newState = state.map(step => {
        if (step.clientId === updatedStepData.clientId) {
          console.log(`Updating step ${step.clientId} (Order: ${step.order})`);
          // Return a new object combining old order with new data
          return {
            ...updatedStepData, // Use all updated data
            order: step.order, // Keep the original order from the state
            clientId: step.clientId, // Ensure clientId isn't accidentally changed
          };
        }
        return step; // Return unchanged step
      });
      // Order doesn't change on update, so no recalculation needed unless specifically required
      break;
    }

    case 'DELETE_STEP': {
      const { index } = action.payload;
      if (index < 0 || index >= state.length) {
        console.error('DELETE_STEP: Index out of bounds', index);
        newState = state; // Return original state if index is invalid
      } else {
        const clonedState = deepClone(state); // Clone current state
        const deletedStep = clonedState[index]; // Get the step being deleted
        console.log(`Deleting step ${deletedStep.clientId} at index ${index}`);

        // Remove the step immutably
        // Remove the step immutably
        const stepsAfterDelete = clonedState.filter((_, i) => i !== index);

        // Update references logic removed

        // Recalculate order
        newState = recalculateStepOrder(stepsAfterDelete);
      }
      break;
    }

    case 'MOVE_STEP': {
      const { index, direction } = action.payload;
      const maxIndex = state.length - 1;

      // Validate move
      if (
        index < 0 || index > maxIndex ||
        (direction === 'up' && index === 0) ||
        (direction === 'down' && index === maxIndex)
      ) {
        console.warn('MOVE_STEP: Invalid move attempted', { index, direction, maxIndex });
        newState = state; // Return original state if move is invalid
      } else {
        const clonedState = deepClone(state); // Clone current state
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        console.log(`Moving step from index ${index} to ${targetIndex}`);

        // Perform the swap immutably
        const stepToMove = clonedState[index];
        clonedState.splice(index, 1); // Remove from original position
        clonedState.splice(targetIndex, 0, stepToMove); // Insert at new position

        // Recalculate order
        newState = recalculateStepOrder(clonedState);
      }
      break;
    }

    default:
      console.error('Unknown action type:', action);
      newState = state; // Return current state if action is unknown
  }

  console.log("State AFTER action:", deepClone(newState)); // Log state after change
  return newState;
}

// --- Custom Hook ---

// Add optional workflowId parameter
export function useWorkflowState(initialSteps: WorkflowStep[] = [], workflowId?: string) {
  // Initialize state using the reducer
  // Ensure initial state is properly cloned and ordered
  const [steps, dispatch] = useReducer(
    workflowReducer,
    initialSteps,
    (initSteps) => recalculateStepOrder(deepClone(initSteps || []))
  );

  // Track if this is the first mount
  const isInitializedRef = useRef(false);
  // Track previous workflowId to detect actual workflow changes
  const prevWorkflowIdRef = useRef<string | undefined>(workflowId);

  // Corrected effect for initialization and workflow switching
  useEffect(() => {
    const workflowIdChanged = workflowId !== prevWorkflowIdRef.current;

    // Initialize state only on the first mount OR when the workflowId actually changes.
    // Do NOT reset based on changes to the initialSteps reference for the *same* workflow.
    if (!isInitializedRef.current || workflowIdChanged) {
      if (!isInitializedRef.current) {
        console.log(`%cuseWorkflowState: Initializing state for workflow ${workflowId || '(new)'}.`, 'color: green; font-weight: bold;');
      } else {
        // This condition means workflowIdChanged must be true
        console.log(`%cuseWorkflowState: Workflow ID changed from ${prevWorkflowIdRef.current} to ${workflowId}. Resetting state.`, 'color: orange; font-weight: bold;');
      }
      
      // Perform the state reset/initialization
      dispatch({
        type: 'SET_STEPS',
        payload: { steps: initialSteps || [] } // Use the potentially new initialSteps
      });
      
      // Mark as initialized and update the tracked workflowId
      isInitializedRef.current = true;
      prevWorkflowIdRef.current = workflowId;
    }
    // If only the initialSteps reference changes (but workflowId is the same),
    // this effect will run due to the dependency array, but the condition inside
    // (!isInitializedRef.current || workflowIdChanged) will be false, preventing the reset.
    // The current state managed by the reducer remains intact.

  }, [initialSteps, workflowId]); // Keep dependencies: need initialSteps for reset, workflowId to detect change

  // --- Action Creators ---
  // Use useCallback to memoize action dispatchers, preventing unnecessary re-renders

  // Note: The external setSteps might still cause issues if called inappropriately.
  // Consider if it's truly needed or if all state changes should go through specific actions.
  const setSteps = useCallback((newSteps: WorkflowStep[]) => {
    console.warn("useWorkflowState: External setSteps called. This might bypass intended state logic.");
    // If this is used, it should probably also update the initialization refs,
    // but it's generally better to use specific actions like ADD, UPDATE, DELETE.
    dispatch({ type: 'SET_STEPS', payload: { steps: newSteps } });
  }, []);

  // addStep signature simplified (no branchPath)
  const addStep = useCallback((
    actionType: ActionType,
    insertAfterIndex: number
  ) => {
    dispatch({ type: 'ADD_STEP', payload: { actionType, insertAfterIndex } });
  }, []);

  const updateStep = useCallback((stepData: WorkflowStep) => {
    // Ensure the stepData includes clientId for identification
    if (!stepData.clientId) {
      console.error("UPDATE_STEP: Missing clientId in step data", stepData);
      return;
    }
    dispatch({ type: 'UPDATE_STEP', payload: { step: stepData } });
  }, []);

  const deleteStep = useCallback((index: number) => {
    dispatch({ type: 'DELETE_STEP', payload: { index } });
  }, []);

  const moveStep = useCallback((index: number, direction: 'up' | 'down') => {
    dispatch({ type: 'MOVE_STEP', payload: { index, direction } });
  }, []);

  // Return the state and the memoized action creators
  return {
    steps,
    setSteps,
    addStep,
    updateStep,
    deleteStep,
    moveStep,
  };
}
