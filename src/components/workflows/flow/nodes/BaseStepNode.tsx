'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useEdges } from 'reactflow';
import { cn } from '@/lib/utils';
import { Pencil, Trash2, Plus } from 'lucide-react'; // Import Plus
import { WorkflowStep, ActionType } from '@/types/workflow'; // Import ActionType
import { getNodeHandles } from '../utils/flowTransformers';

// Extend NodeProps data to include our specific step data and the callback
interface StepNodeData extends WorkflowStep {
  onEdit?: (step: WorkflowStep) => void;
  onDelete?: (step: WorkflowStep) => void;
  onAddStepClick?: (sourceNodeId: string, sourceHandleId?: string) => void;
}

export interface BaseStepNodeProps extends NodeProps<StepNodeData> { // Use StepNodeData
  icon: React.ReactNode;
  label: string;
  summary: string;
  color: {
    bg: string;
    border: string;
    text: string;
  };
}

function BaseStepNode({ 
  id, 
  data, 
  selected, 
  type, // The node type string (e.g., 'emailNode')
  icon, 
  label, 
  summary, 
  color, 
  // onEdit and onDelete are now expected inside data
}: BaseStepNodeProps) {
  const { getEdges } = useReactFlow();
  const edges = useEdges(); // Get current edges

  // Type assertion for data
  const stepData = data as StepNodeData; 
  const { sources, target } = getNodeHandles(type, stepData); // Pass stepData to getNodeHandles

  // Check if this node type can have a successor
  const canHaveSuccessor = stepData.actionType !== 'remove_from_workflow';

  const handleEdit = () => {
    if (stepData.onEdit) stepData.onEdit(stepData);
  };
  
  const handleDelete = () => {
    if (stepData.onDelete) stepData.onDelete(stepData);
  };

  const handleAddClick = (handleId: string) => {
    if (stepData.onAddStepClick) {
      stepData.onAddStepClick(id, handleId);
    }
  };
  
  return (
    <div
      className={cn(
        "w-48 p-2 rounded-lg border-2 transition-all duration-200 shadow-sm hover:shadow-md", // Reduced width, padding, added shadow
        color.bg,
        color.border,
        selected ? "ring-2 ring-offset-1 ring-blue-400" : "", // Added ring offset
      )}
    >
      {/* Input handle */}
      <Handle
        id={target}
        type="target"
        position={Position.Top}
        className="w-3 h-3"
        isConnectable={false} // Prevent incoming connections via drag
      />
      
      {/* Node header */}
      <div className="flex items-center gap-1.5 mb-1.5"> {/* Reduced gap and margin */}
        <div className={cn("flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full", color.text, "bg-opacity-20")}> {/* Slightly smaller icon container */}
          {icon}
        </div>
        <div className={cn("font-medium text-sm truncate", color.text)}>{label}</div> {/* Added truncate */}
        {/* Removed step order display for cleaner look */}
      </div>
      
      {/* Node content */}
      <div className={cn("text-xs", "text-gray-600", "mb-1.5", "line-clamp-2")}> {/* Smaller text, margin, line clamp */}
        {summary}
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-end mt-1 gap-0.5"> {/* Reduced margin and gap */}
        <button 
          onClick={handleEdit}
          className="p-1 text-gray-500 hover:text-gray-700 rounded"
        >
          <Pencil size={14} />
        </button>
        <button 
          onClick={handleDelete}
          className="p-1 text-red-500 hover:text-red-700 rounded"
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      {/* Output handle */}
      {sources.map((handleId) => (
        <Handle
          key={handleId}
          id={handleId}
          type="source"
          position={Position.Bottom}
          className={cn("w-3 h-3", color.border.replace('border', 'bg'))}
          isConnectable={false} // Prevent dragging connections from handle
        />
      ))}

      {/* Render Add Step Button(s) conditionally */}
      {canHaveSuccessor && sources.map((handleId) => {
        // Check if an edge already exists for this specific source handle
        const hasOutgoingEdge = edges.some(edge => edge.source === id && edge.sourceHandle === handleId);
        
        // Calculate button position if needed (only relevant for multiple handles, but keep consistent)
        const buttonOffset = sources.length > 1 ? 0 : 0; // Adjust if specific positioning needed for multiple handles

        return !hasOutgoingEdge ? (
          <button
            key={`add-${handleId}`}
            onClick={() => handleAddClick(handleId)}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 bottom-[-30px]", // Position below the node center
              "flex items-center justify-center w-6 h-6 rounded-full",
              "bg-gray-300 hover:bg-gray-400 text-white transition-colors duration-150",
              "shadow-md z-10" // Ensure it's clickable
            )}
            style={{ 
              // Adjust left position if multiple handles exist - simple center for now
              // left: sources.length > 1 ? `calc(${handlePosition}% - 12px)` : '50%', 
            }}
            title="Add next step"
          >
            <Plus size={16} />
          </button>
        ) : null;
      })}
    </div>
  );
}

export default memo(BaseStepNode);
