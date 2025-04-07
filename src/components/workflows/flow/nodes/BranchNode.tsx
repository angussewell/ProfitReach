'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useEdges } from 'reactflow'; // Import hooks
import { WorkflowStep, BranchConfig } from '@/types/workflow';
import { cn } from '@/lib/utils';
import { GitBranch, Pencil, Trash2, Plus } from 'lucide-react'; // Import Plus

// Define expected data structure, including the callback
interface BranchNodeData extends WorkflowStep {
  onEdit?: (step: WorkflowStep) => void;
  onDelete?: (step: WorkflowStep) => void;
  onAddStepClick?: (sourceNodeId: string, sourceHandleId?: string) => void;
}

function BranchNode({ id, data, selected }: NodeProps<BranchNodeData>) { // Use id and updated NodeProps
  const { getEdges } = useReactFlow();
  const edges = useEdges(); // Get current edges

  const stepData = data as BranchNodeData; // Type assertion
  const config = stepData.config as BranchConfig;
  
  // Fix the branch summary display bug
  const getBranchSummary = () => {
    if (config?.type === 'percentage_split' && Array.isArray(config.paths) && config.paths.length > 0) {
      return config.paths
        .map(path => {
          const weight = path.weight ?? '??'; // Fallback for missing weight
          const nextStep = path.nextStepOrder ?? '??'; // Fallback for missing nextStepOrder
          return `${weight}% → Step #${nextStep}`;
        })
        .join(' | ');
    } else if (config?.type === 'percentage_split') {
      return 'Branch: No paths configured';
    }
    return 'Branch: Configure percentage split';
  };
  
  const handleEdit = () => {
    if (stepData.onEdit) stepData.onEdit(stepData);
  };
  
  const handleDelete = () => {
    if (stepData.onDelete) stepData.onDelete(stepData);
  };

  const handleAddClick = (handleId: string) => {
    if (stepData.onAddStepClick) {
      stepData.onAddStepClick(id, handleId); // Pass node ID and specific handle ID
    }
  };
  
  // Get paths for handles
  const paths = config?.type === 'percentage_split' && Array.isArray(config.paths) 
    ? config.paths 
    : [];
  
  return (
    <div
      className={cn(
        "w-48 p-2 rounded-lg border-2 transition-all duration-200 shadow-sm hover:shadow-md", // Reduced width, padding, added shadow
        "bg-orange-50",
        "border-orange-200",
        selected ? "ring-2 ring-offset-1 ring-orange-400" : "", // Added ring offset
      )}
    >
      {/* Input handle */}
      <Handle
        id="target"
        type="target"
        position={Position.Top}
        className="w-3 h-3"
        isConnectable={false} // Prevent incoming connections via drag
      />
      
      {/* Node header */}
      <div className="flex items-center gap-1.5 mb-1.5"> {/* Reduced gap and margin */}
        <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-orange-600 bg-orange-100"> {/* Slightly smaller icon container */}
          <GitBranch className="h-5 w-5" />
        </div>
        <div className="font-medium text-sm text-orange-800 truncate">Branch (Split)</div> {/* Added truncate */}
        {/* Removed step order display */}
      </div>
      
      {/* Branch content */}
      <div className="text-xs text-orange-700 mt-1 bg-orange-100/50 p-1.5 rounded mb-1.5 line-clamp-2"> {/* Smaller text/padding, margin, line clamp */}
        {getBranchSummary()}
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
      
      {/* Output handles - one for each path */}
      {paths.map((path, index) => {
        // Calculate position along the bottom edge
        const portionOfWidth = 1 / (paths.length + 1);
        const position = portionOfWidth * (index + 1);
        
        return (
          <Handle
            key={index}
            id={`source-${index}`}
            type="source"
            position={Position.Bottom}
            className="w-3 h-3 bg-orange-500"
            style={{ left: `${position * 100}%` }}
            isConnectable={false} // Prevent dragging connections from handle
          />
        );
      })}

      {/* Render Add Step Button(s) conditionally below each handle */}
      {paths.map((path, index) => {
        const handleId = `source-${index}`;
        // Check if an edge already exists for this specific source handle
        const hasOutgoingEdge = edges.some(edge => edge.source === id && edge.sourceHandle === handleId);
        
        // Calculate position for the button to align with the handle
        const portionOfWidth = 1 / (paths.length + 1);
        const handlePositionPercent = portionOfWidth * (index + 1) * 100;

        return !hasOutgoingEdge ? (
          <button
            key={`add-${handleId}`}
            onClick={() => handleAddClick(handleId)}
            className={cn(
              "absolute bottom-[-30px]", // Position below the node
              "flex items-center justify-center w-6 h-6 rounded-full",
              "bg-gray-300 hover:bg-gray-400 text-white transition-colors duration-150",
              "shadow-md z-10" // Ensure it's clickable
            )}
            style={{ 
              left: `calc(${handlePositionPercent}% - 12px)` // Center button under handle (12px is half width)
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

export default memo(BranchNode);
