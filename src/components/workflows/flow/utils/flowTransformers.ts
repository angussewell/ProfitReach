import { Node, Edge, Position } from 'reactflow';
import { WorkflowStep, BranchConfig } from '@/types/workflow';

// Node types we'll create
export const NODE_TYPES: Record<string, string> = {
  wait: 'waitNode',
  send_email: 'emailNode',
  update_field: 'updateFieldNode',
  clear_field: 'clearFieldNode',
  webhook: 'webhookNode',
  branch: 'branchNode',
  remove_from_workflow: 'removeNode',
};

// Add console log to check which node types are registered
console.log('Registered NODE_TYPES:', NODE_TYPES);

// For calculating positions of nodes
export interface NodePosition {
  x: number;
  y: number;
}

// Get the handles for a specific node type
export function getNodeHandles(type: string, data: any): { sources: string[], target: string } {
  if (type === NODE_TYPES.branch && data.config?.type === 'percentage_split') {
    const paths = data.config.paths || [];
    return {
      sources: paths.map((_: any, i: number) => `source-${i}`),
      target: 'target',
    };
  }
  
  return {
    sources: ['source'],
    target: 'target',
  };
}

/**
 * Calculate node positions for a workflow
 * - Uses a simple vertical layout
 * - Branches are horizontally offset
 */
export function calculateNodePositions(
  steps: WorkflowStep[],
  includeTrigger: boolean = false, // Add flag to control trigger offset
  triggerNodeYOffset: number = 150 // How much space the trigger node takes
): Record<string, NodePosition> {
  const positions: Record<string, NodePosition> = {};
  const nodeVerticalSpacing = 150;
  const nodeHorizontalOffset = 250; // Keep this for centering logic
  const branchPathOffset = 200;
  const initialY = includeTrigger ? triggerNodeYOffset : 50; // Start lower if trigger is present

  // First identify all branch targets for proper positioning
  const branchTargets = new Map<number, { sourceOrder: number, pathIndex: number, totalPaths: number }>();
  
  steps.forEach(step => {
    if (step.actionType === 'branch' && step.config && typeof step.config === 'object') {
      const config = step.config as BranchConfig;
      if (config.type === 'percentage_split' && Array.isArray(config.paths)) {
        config.paths.forEach((path, index) => {
          branchTargets.set(path.nextStepOrder, {
            sourceOrder: step.order,
            pathIndex: index,
            totalPaths: config.paths.length
          });
        });
      }
    }
  });
  
  // Now calculate positions for each step
  steps.forEach(step => {
    const defaultX = 300; // Base center position
    let x = defaultX;
    // Calculate Y based on order, adding initial offset
    const y = initialY + step.order * nodeVerticalSpacing; 

    // Adjust X position if this step is a branch target
    const branchInfo = branchTargets.get(step.order);
    if (branchInfo) {
      // Offset based on branch path index
      const { pathIndex, totalPaths } = branchInfo;
      // Calculate offset from center
      const offsetFactor = pathIndex - (totalPaths - 1) / 2;
      x = defaultX + (offsetFactor * branchPathOffset);
    }
    
    positions[step.clientId] = { x, y };
  });
  
  return positions;
}

/**
 * Transform workflow steps to React Flow nodes and edges, including a trigger node.
 * @param steps The array of workflow steps.
 * @param onAddStepClick Callback function to trigger when a '+' button is clicked.
 */
export function stepsToNodesAndEdges(
  steps: WorkflowStep[],
  onAddStepClick: (sourceNodeId: string, sourceHandleId?: string) => void // Add callback param
): {
  nodes: Node[],
  edges: Edge[]
} {
  const TRIGGER_NODE_ID = 'trigger';
  const TRIGGER_NODE_TYPE = 'triggerNode';
  const TRIGGER_NODE_Y_OFFSET = 150; // Space reserved for trigger + gap

  // Debug steps
  console.log('stepsToNodesAndEdges input:', steps);
  
  // Calculate node positions for actual steps, accounting for trigger offset
  const positions = calculateNodePositions(steps, true, TRIGGER_NODE_Y_OFFSET); 
  
  // Create nodes for actual steps
  const stepNodes: Node[] = steps.map(step => {
    // Use calculated position which already includes the offset
    const position = positions[step.clientId] || { x: 100, y: TRIGGER_NODE_Y_OFFSET + step.order * 150 }; 
    
    // Use default node type if the actionType is not found in NODE_TYPES
    const nodeType = NODE_TYPES[step.actionType] || 'default';
    
    // Debug node creation
    console.log(`Creating node for step ${step.order}:`, {
      actionType: step.actionType,
      mappedNodeType: nodeType,
      position
    });
    
    return {
      id: step.clientId,
      type: nodeType,
      position,
      data: { 
        ...step, 
        onAddStepClick // Pass the callback into the node data
      },
    };
  });

  // Determine the center X position for the trigger node
  // Use the position of the first step if available, otherwise default
  const triggerXPosition = stepNodes.length > 0 ? positions[stepNodes[0].id]?.x ?? 300 : 300;

  // Create the Trigger Node
  // Create the Trigger Node
  const triggerNode: Node = {
    id: TRIGGER_NODE_ID,
    type: TRIGGER_NODE_TYPE,
    position: { x: triggerXPosition, y: 50 }, // Fixed Y position at the top
    data: {
      label: 'Workflow Trigger',
      onAddStepClick // Pass the callback into the trigger node data
    },
    deletable: false,
    selectable: false,
    draggable: false, // Optionally make it non-draggable
  };

  // Combine trigger node and step nodes
  const nodes: Node[] = [triggerNode, ...stepNodes];
  
  // Create edges, including AddStepEdge where appropriate
  const edges: Edge[] = [];
  const stepClientIds = new Set(steps.map(s => s.clientId));
  const stepsWithOutgoingEdges = new Set<string>(); // Track steps that already have a connection leaving them

  // Removed the createAddEdge helper function

  // Connect Trigger to first step if it exists
  if (steps.length > 0) {
    const firstStep = steps[0];
    edges.push({
      id: `e-${TRIGGER_NODE_ID}-${firstStep.clientId}`,
      source: TRIGGER_NODE_ID,
      sourceHandle: 'source',
      target: firstStep.clientId,
      targetHandle: 'target',
      type: 'step-edge',
      style: { strokeWidth: 2 },
    });
    stepsWithOutgoingEdges.add(TRIGGER_NODE_ID);
  }
  // If steps.length === 0, no initial edge is created from the trigger.

  // Connect sequential steps and branch steps
  steps.forEach((currentStep, index) => {
    const isLastStep = index === steps.length - 1;
    const canHaveSuccessor = currentStep.actionType !== 'remove_from_workflow'; // Define types that cannot have successors

    if (currentStep.actionType === 'branch' && currentStep.config && typeof currentStep.config === 'object') {
      // Handle branch connections
      const config = currentStep.config as BranchConfig;
      // *** ADDED LOGGING START ***
      console.log(`[Branch Debug] Step ${currentStep.order} (${currentStep.clientId}): Processing branch node. Config:`, JSON.stringify(config));
      // *** ADDED LOGGING END ***
      if (config.type === 'percentage_split' && Array.isArray(config.paths)) {
        config.paths.forEach((path, pathIndex) => {
          // *** ADDED LOGGING START ***
          console.log(`[Branch Debug] Step ${currentStep.order}, Path ${pathIndex}: Looking for target step with order ${path.nextStepOrder}. Weight: ${path.weight}`);
          // *** ADDED LOGGING END ***
          const targetStep = steps.find(s => s.order === path.nextStepOrder);
          if (targetStep) {
            // *** ADDED LOGGING START ***
            console.log(`[Branch Debug] Step ${currentStep.order}, Path ${pathIndex}: Found target step ${targetStep.order} (${targetStep.clientId}). Creating edge.`);
            // *** ADDED LOGGING END ***
            edges.push({
              id: `e-branch-${currentStep.clientId}-${targetStep.clientId}-${pathIndex}`,
              source: currentStep.clientId,
              sourceHandle: `source-${pathIndex}`,
              target: targetStep.clientId,
              targetHandle: 'target',
              label: `${path.weight ?? '??'}%`,
              data: { weight: path.weight },
              type: 'step-edge',
              style: { strokeWidth: 2 },
            });
            stepsWithOutgoingEdges.add(currentStep.clientId); // Mark branch as having outgoing edges
          } else {
            // Existing warning is good, let's enhance it slightly
            console.warn(`[Branch Debug] Step ${currentStep.order}, Path ${pathIndex}: Target step order ${path.nextStepOrder} NOT FOUND in current steps array.`);
          }
        });
      } else {
          // *** ADDED LOGGING START ***
          console.log(`[Branch Debug] Step ${currentStep.order} (${currentStep.clientId}): Branch node config type is not 'percentage_split' or paths is not an array.`);
          // *** ADDED LOGGING END ***
      }
    } else if (canHaveSuccessor) {
      // Handle normal sequential connections OR add AddStepEdge if it's the end of a sequence
      let foundSuccessor = false;
      // Check if the *next* step in the array is the direct successor
      if (!isLastStep) {
        const nextStep = steps[index + 1];
        // Check if next step isn't targeted by a branch from somewhere else
        const isTargetedByBranch = steps.some(s =>
          s.actionType === 'branch' && s.config && typeof s.config === 'object' &&
          (s.config as BranchConfig).paths?.some(p => p.nextStepOrder === nextStep.order)
        );
        if (!isTargetedByBranch) {
           edges.push({
             id: `e-${currentStep.clientId}-${nextStep.clientId}`,
             source: currentStep.clientId,
             sourceHandle: 'source',
             target: nextStep.clientId,
             targetHandle: 'target',
             type: 'step-edge',
             style: { strokeWidth: 2 },
           });
           stepsWithOutgoingEdges.add(currentStep.clientId);
           foundSuccessor = true;
        }
      }

      // If this step can have a successor, but we haven't added an edge leaving it yet...
      // We no longer add an 'AddStepEdge' here. The connection logic in WorkflowFlow will handle adding steps.
      // if (!stepsWithOutgoingEdges.has(currentStep.clientId)) {
      //    // Removed createAddEdge call
      // }
    }
  });
  
  return { nodes, edges };
}
