'use client';

import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeProps,
  getSmoothStepPath, // Import getSmoothStepPath instead of getBezierPath
  EdgeLabelRenderer,
  Position, // Import Position if needed for getSmoothStepPath options
} from 'reactflow';

function StepEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  label,
  markerEnd,
}: EdgeProps) {
  // Calculate the path for the edge using getSmoothStepPath
  // Ensure sourcePosition and targetPosition are correctly passed or inferred
  // Defaulting to Bottom for source and Top for target if not explicitly passed,
  // which aligns with BranchNode -> NextNode connection.
  const resolvedSourcePosition = sourcePosition || Position.Bottom;
  const resolvedTargetPosition = targetPosition || Position.Top;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: resolvedSourcePosition, // Use resolved position
    targetX,
    targetY,
    targetPosition: resolvedTargetPosition, // Use resolved position
    // Optional: Adjust borderRadius and offset if needed for appearance
    // borderRadius: 5,
    // offset: 20, 
  });

  // Style for branch edges vs regular edges
  const edgeStyle = {
    ...style, // Keep the correct style definition
    stroke: data?.weight ? '#ea580c' : '#94a3b8', // orange for branch edges, slate for regular
    strokeWidth: data?.weight ? 2 : 1.5,
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
      />
      
      {/* Render label if provided */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              fontSize: 12,
              fontWeight: 500,
              padding: '2px 6px',
              backgroundColor: data?.weight ? 'rgba(255, 237, 213, 0.9)' : 'rgba(241, 245, 249, 0.9)',
              borderRadius: 4,
              color: data?.weight ? '#9a3412' : '#475569',
              border: data?.weight ? '1px solid #fdba74' : '1px solid #cbd5e1',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(StepEdge);
