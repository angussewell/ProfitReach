// Workflow Types

// Action types
export type ActionType =
  | 'wait'
  | 'send_email'
  | 'update_field'
  | 'clear_field'
  | 'webhook'
  | 'branch'
  | 'remove_from_workflow';

// Config Types
export interface WaitConfig {
  duration: number;
  unit: 'minutes' | 'hours' | 'days';
}

export interface SendEmailConfig {
  subjectOverride?: string | null;
  scenarioId?: string | null;
}

export interface UpdateFieldConfig {
  fieldPath: string;
  value: string;
}

export interface ClearFieldConfig {
  fieldPath: string;
}

export interface WebhookConfig {
  url: string;
  method: 'POST'; // Only POST method is supported
}

export type BranchOperator =
  | 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';

// Branch config for percentage split
export interface BranchConfig {
  type: 'percentage_split';
  paths: { weight: number; nextStepOrder: number }[];
}

export interface RemoveFromWorkflowConfig {
  // No specific config needed
}

// Union type for all possible configs
export type StepConfig =
  | WaitConfig
  | SendEmailConfig
  | UpdateFieldConfig
  | ClearFieldConfig
  | WebhookConfig
  | BranchConfig
  | RemoveFromWorkflowConfig;

// Workflow Step Type
export interface WorkflowStep {
  clientId: string; // Temporary client-side ID for React keys
  order: number; // 1-based index/order
  actionType: ActionType;
  config: StepConfig | {}; // Use empty object for types with no config
}

// Full workflow definition
export interface WorkflowDefinition {
  workflowId: string;
  name: string;
  description: string | null;
  dailyContactLimit: number | null;
  dripStartTime: Date | null;
  dripEndTime: Date | null;
  timezone: string | null;
  steps: WorkflowStep[];
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Form data types for workflow metadata
export interface WorkflowMetadataFormData {
  name: string;
  description?: string | null;
  dailyContactLimit?: number | null;
  dripStartTime?: string | null;
  dripEndTime?: string | null;
  timezone?: string | null;
}

// Utility type to represent a branch path relation in the UI
export interface BranchPathRelation {
  fromStep: number; // Order of the branch step
  toStep: number;   // Order of the target step
  weight: number;   // Percentage weight
}
