'use client';

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  Position,
} from 'reactflow';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the props specifically needed by our custom edge
interface AddStepEdgeProps extends EdgeProps {
  data?: {
    // Callback now only needs the ID of the node preceding the add action
    onAddStepClick?: (sourceNodeId: string) => void;
  };
}

export default function AddStepEdge({
  id,
  source, // source node id
  target, // target node id
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data, // Contains our custom onAddStepClick callback
}: AddStepEdgeProps) {
  // We might need a more specific path calculation if we want the button
  // directly below the source node instead of on the edge midpoint.
  // For now, let's stick with the Bezier path midpoint.
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleAddClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent edge selection/drag
    if (data?.onAddStepClick) {
      // Pass only the source node ID
      data.onAddStepClick(source);
    } else {
      console.warn('onAddStepClick not provided to AddStepEdge for edge:', id);
    }
  };

  // Calculate the position for the button, slightly below the source node's center
  // Adjust the Y offset as needed based on node size
  const buttonX = sourceX;
  const buttonY = sourceY + 30; // Example offset, adjust as needed

  return (
    <>
      {/* No BaseEdge needed, we only render the button */}

      {/* Label renderer for the button */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            // Use the calculated button position
            transform: `translate(-50%, -50%) translate(${buttonX}px,${buttonY}px)`,
            pointerEvents: 'all', // Make the div clickable
          }}
          // Removed group class, button is always visible now
          className="nodrag nopan absolute"
        >
          <Button
            size="icon"
            variant="outline"
            className={cn(
              "absolute w-6 h-6 rounded-full bg-background border-2 border-primary text-primary",
              // Removed opacity classes to make button always visible
              // "opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out",
              "hover:bg-primary hover:text-primary-foreground" // Style on button hover
            )}
            // Correctly define the style prop as an object
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            onClick={handleAddClick}
            title="Add step" // Updated title
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
