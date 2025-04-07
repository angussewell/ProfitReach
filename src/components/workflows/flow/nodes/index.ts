import { NodeTypes } from 'reactflow';
// Removed NODE_TYPES import as it's not directly used here for registration keys
import BranchNode from './BranchNode';
import DefaultNode from './DefaultNode';
import TriggerNode from './TriggerNode'; // Import the new TriggerNode
import {
  WaitNodeComponent,
  EmailNodeComponent,
  UpdateFieldNodeComponent,
  ClearFieldNodeComponent,
  WebhookNodeComponent,
  RemoveNodeComponent
} from './StandardNodes';

// Map of node types to their components
export const nodeTypes: NodeTypes = {
  // Use the string values directly to ensure correct matching
  'waitNode': WaitNodeComponent,
  'emailNode': EmailNodeComponent,
  'updateFieldNode': UpdateFieldNodeComponent,
  'clearFieldNode': ClearFieldNodeComponent,
  'webhookNode': WebhookNodeComponent,
  'branchNode': BranchNode,
  'removeNode': RemoveNodeComponent,
  'triggerNode': TriggerNode, // Register the TriggerNode
  // Register a default node type to handle unknown types
  'default': DefaultNode, 
};

// Debug node type registration
console.log('Registered node types:', Object.keys(nodeTypes));

// Export all node components
export {
  BranchNode,
  DefaultNode,
  WaitNodeComponent as WaitNode,
  EmailNodeComponent as EmailNode,
  UpdateFieldNodeComponent as UpdateFieldNode,
  ClearFieldNodeComponent as ClearFieldNode,
  WebhookNodeComponent as WebhookNode,
  RemoveNodeComponent as RemoveNode,
  TriggerNode // Export TriggerNode
};
