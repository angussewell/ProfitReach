import { EdgeTypes } from 'reactflow';
// Import the new custom edge component instead of the old one
import AddStepEdge from './AddStepEdge';
import StepEdge from './StepEdge'; // Assuming StepEdge is the standard visual edge

// Map of edge types to edge components
export const edgeTypes: EdgeTypes = {
  addStepEdge: AddStepEdge, // Edge specifically for the '+' button
  stepEdge: StepEdge,     // Standard edge between steps
  default: StepEdge,        // Fallback to standard edge
};

// Export both edge components if they are used elsewhere,
// but edgeTypes is the primary export for React Flow configuration.
export { StepEdge, AddStepEdge };
