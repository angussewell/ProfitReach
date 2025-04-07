# Workflow Builder Components

This directory contains components for the enhanced Workflow Builder UI. These components provide a more intuitive and visually appealing interface for creating and managing workflows.

## Components Overview

### WorkflowStepCard

The `WorkflowStepCard` component represents individual workflow steps as distinct visual cards. Each card displays:

- The step's order number
- An icon representing the action type (wait, send_email, etc.)
- A summary of the step's configuration
- Action buttons (edit, delete, move up/down)

The cards are connected with visual lines to represent the flow direction, and special styling is applied for steps that are branch targets.

### WorkflowBuilder

The `WorkflowBuilder` component is responsible for:

- Organizing and displaying all workflow steps
- Handling the layout of branch paths for percentage splits
- Providing "Add Step" buttons between steps and at the end
- Managing the visual representation of the workflow flow

### WorkflowStepConfigModal

This modal component provides a user interface for adding and editing workflow steps:

- Dynamic form fields based on the selected action type
- Specialized UI for configuring branching logic
- Field validation using react-hook-form and zod

## Implementation Details

The enhanced workflow builder implements the following features:

1. **Intuitive Step Representation:** Each step is now a visually distinct card with clear action indicators.

2. **Visual Flow Connectors:** Steps are connected with vertical lines to indicate flow direction.

3. **Branch Visualization:** The percentage split branches are visually represented, with branch targets visually offset to indicate different paths.

4. **Enhanced Interactions:** 
   - Hover-based "Add Step" buttons between steps
   - Step cards are color-coded by action type
   - Clearer editing interface for configuration

5. **Data Structure Preservation:** All changes maintain compatibility with the existing backend data structure.

## Usage

The workflow builder is implemented in the `/workflows/[workflowId]/edit` page, maintaining all the existing functionality while enhancing the UI/UX.

Example:

```tsx
<WorkflowBuilder
  steps={steps}
  onAddStep={handleAddStep}
  onEditStep={handleEditStep}
  onDeleteStep={handleDeleteStep}
  onMoveStep={handleMoveStep}
/>
```

With the config modal:

```tsx
<WorkflowStepConfigModal
  isOpen={isStepModalOpen}
  onOpenChange={setIsStepModalOpen}
  stepData={currentStepData}
  onSave={handleSaveStep}
  existingSteps={steps}
  editingIndex={editingStepIndex}
/>
