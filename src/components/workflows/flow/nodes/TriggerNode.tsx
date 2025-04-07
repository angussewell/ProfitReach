'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useEdges } from 'reactflow';
import { cn } from '@/lib/utils';
import { Play, Plus } from 'lucide-react'; // Import Plus icon

// Define expected data structure, including the callback
interface TriggerNodeData {
  label: string;
  onAddStepClick: (sourceNodeId: string, sourceHandleId?: string) => void;
}

function TriggerNode({ id, data, selected }: NodeProps<TriggerNodeData>) {
  const { getEdges } = useReactFlow();
  const edges = useEdges(); // Get current edges to check connections

  // Check if an edge already exists from this node's source handle
  const hasOutgoingEdge = edges.some(edge => edge.source === id && edge.sourceHandle === 'source');

  const handleAddClick = () => {
    if (data.onAddStepClick) {
      data.onAddStepClick(id, 'source'); // Pass node ID and handle ID
    }
  };

  return (
    <>
      <div
        className={cn(
          "w-48 p-3 rounded-lg border-2 transition-all duration-200 shadow-sm relative", // Added relative positioning
          "bg-teal-50", // Distinct color
          "border-teal-200",
          selected ? "ring-2 ring-offset-1 ring-teal-400" : "",
        )}
      >
        {/* Node header */}
        <div className="flex items-center gap-2 mb-2"> {/* Added margin-bottom */}
          <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-teal-600 bg-teal-100">
            <Play className="h-4 w-4 fill-current" /> {/* Play icon */}
          </div>
          <div className="font-medium text-sm text-teal-800">{data.label || 'Workflow Trigger'}</div>
        </div>

        {/* Placeholder for potential future content */}
        {/* <div className="text-xs text-teal-700">Contact enrolled</div> */}

        {/* Always render the Output handle */}
        <Handle
          id="source" // Single source handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 bg-teal-500 !-bottom-1.5" // Adjusted position
          isConnectable={false} // Prevent dragging connections from handle
        />
        {/* No target handle needed */}
      </div>

      {/* Add Step Button - Render conditionally below the handle */}
      {!hasOutgoingEdge && (
        <button
          onClick={handleAddClick}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 bottom-[-30px]", // Position below the node
            "flex items-center justify-center w-6 h-6 rounded-full",
            "bg-gray-300 hover:bg-gray-400 text-white transition-colors duration-150",
            "shadow-md z-10" // Ensure it's clickable
          )}
          title="Add next step"
        >
          <Plus size={16} />
        </button>
      )}
    </>
  );
}

export default memo(TriggerNode);
