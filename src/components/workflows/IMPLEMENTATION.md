# React Flow Workflow Builder Implementation

## Overview

This implementation transforms the existing list-based workflow builder into an intuitive flowchart-style visualization using the React Flow library. The implementation maintains all the existing functionality while enhancing the visual representation and user experience.

## Key Features

1. **Node-based Visualization**: Each workflow step is now rendered as a compact, square-like node
2. **Edge Connections**: Clear visual connections between steps, with special styling for branch paths
3. **Branching Visualization**: Branch steps display multiple output handles and correctly route to target steps
4. **Fixed Branch Summary Display**: The branch configuration summary now correctly shows percentages and target steps
5. **Interactive Canvas**: Users can pan and zoom the workflow canvas
6. **Existing Data Structure**: Implementation maintains compatibility with the existing backend API/data

## Component Structure

```
src/components/workflows/
├── WorkflowBuilder.tsx                 # Main wrapper component
├── WorkflowStepConfigModal.tsx         # Modal for editing steps (unchanged)
└── flow/
    ├── WorkflowFlow.tsx                # React Flow wrapper component
    ├── utils/
    │   └── flowTransformers.ts         # Utilities for steps → nodes/edges
    ├── nodes/
    │   ├── BaseStepNode.tsx            # Base node component
    │   ├── BranchNode.tsx              # Specialized branch node
    │   ├── StandardNodes.tsx           # Implementations for other node types
    │   └── index.ts                    # Node type registry
    └── edges/
        ├── StepEdge.tsx                # Custom edge component
        └── index.ts                    # Edge type registry
```

## Implementation Details

### Data Transformation

The implementation converts the workflow steps array to React Flow nodes and edges:

1. **Node Creation**: Each step becomes a visually styled node based on its actionType
2. **Edge Creation**: Connections are created based on step order and branch configurations
3. **Layout Algorithm**: A simple vertical layout with horizontal offsets for branch targets
4. **Node Interactions**: Edit/delete actions are connected to the existing modal system

### Branching Logic

Branch steps (percentage_split) are handled by:

1. Rendering a specialized BranchNode component with multiple output handles
2. Creating edges from these handles to their target steps
3. Fixing the branch summary display to correctly show: `Split: 50% → Step #4 | 50% → Step #5`
4. Applying visual offsets to branch target nodes to create a tree-like structure

### Style and UX

The implementation follows the existing design system:

1. Uses Tailwind and shadcn/ui styling to maintain consistency
2. Applies color coding from the original step cards to nodes
3. Improves the overall aesthetic with subtle edge styling and handle positions
4. Maintains familiar controls (editing, deleting) with the same functionality

## Technical Notes

1. React Flow's viewport capabilities (pan/zoom) are enabled for larger workflows
2. The implementation doesn't use complex layout libraries, keeping it lightweight
3. Future improvements could include:
   - Drag-and-drop step reordering
   - Direct edge connection manipulation
   - Minimap for very complex workflows

## Usage

The usage pattern remains identical to the original implementation. The WorkflowBuilder component accepts the same props:

```tsx
<WorkflowBuilder
  steps={steps}
  onAddStep={handleAddStep}
  onEditStep={handleEditStep}
  onDeleteStep={handleDeleteStep}
  onMoveStep={handleMoveStep}
/>
```

The React Flow visualization is implemented behind this interface, maintaining backward compatibility.

## Browser Support

This implementation relies on modern browser features and has been tested with the latest versions of Chrome, Firefox, Safari, and Edge.
