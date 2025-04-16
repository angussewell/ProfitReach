// Workflow Types

// Action types
export type ActionType =
  | 'wait'
  | 'send_email'
  | 'update_field'
  | 'clear_field'
  | 'webhook'
  | 'branch' // Added branch back
  | 'remove_from_workflow'
  | 'scenario';

// Config Types
export interface WaitConfig {
  duration: number;
  unit: 'minutes' | 'hours' | 'days';
}

export interface SendEmailConfig {
  subjectOverride?: string | null;
  scenarioId?: string | null;
}

// Updated UpdateFieldConfig for single value or random pool
export interface UpdateFieldConfig {
  fieldPath: string;
  assignmentType: 'single' | 'random_pool';
  values: string[]; // Always an array, even for single assignment
}

export interface ClearFieldConfig {
  fieldPath: string;
}

export interface WebhookConfig {
  url: string;
  method: 'POST'; // Only POST method is supported
}

// Added BranchConfig back based on usage in WorkflowStepCard
export interface BranchPath {
  weight: number;
  nextStepId: string; // Assuming this refers to the clientId of the next step
}

export interface BranchConfig {
  type: 'percentage_split'; // Assuming only percentage split for now
  paths: BranchPath[];
}

export interface RemoveFromWorkflowConfig {
  // No specific config needed
}

// ScenarioConfig type
export interface ScenarioConfig {
  assignmentType: 'single' | 'random_pool';
  scenarioIds: string[]; // Array of scenario IDs
}

// Union type for all possible configs
export type StepConfig =
  | WaitConfig
  | SendEmailConfig
  | UpdateFieldConfig
  | ClearFieldConfig
  | WebhookConfig
  | BranchConfig // Added BranchConfig back
  | RemoveFromWorkflowConfig
  | ScenarioConfig;

// Workflow Step Type
export interface WorkflowStep {
  clientId: string; // Temporary client-side ID for React keys
  order: number; // 1-based index/order
  actionType: ActionType;
  config: StepConfig | {}; // Use empty object for types with no config
  customName?: string; // Optional custom name for the step
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

// BranchPathRelation removed
