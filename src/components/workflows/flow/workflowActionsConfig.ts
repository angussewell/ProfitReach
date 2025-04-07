import React from 'react';
import {
  Clock, Mail, ClipboardEdit, ClipboardX, Webhook, GitBranch, LogOut, LucideIcon
} from 'lucide-react';
import { ActionType, StepConfig } from '@/types/workflow';

export interface WorkflowActionUIDefinition {
  type: ActionType;
  label: string;
  description: string; // Added description for clarity in chooser
  icon: LucideIcon;
  defaultConfig: StepConfig | {};
}

// Define the configuration for each action type
export const WORKFLOW_ACTIONS_CONFIG: WorkflowActionUIDefinition[] = [
  {
    type: 'wait',
    label: 'Wait',
    description: 'Pause the workflow for a set duration.',
    icon: Clock,
    defaultConfig: { duration: 1, unit: 'days' },
  },
  {
    type: 'send_email',
    label: 'Send Email',
    description: 'Send an email using a predefined scenario.',
    icon: Mail,
    defaultConfig: { scenarioId: null, subjectOverride: null },
  },
  {
    type: 'update_field',
    label: 'Update Field',
    description: 'Set or change a contact field value.',
    icon: ClipboardEdit,
    defaultConfig: { fieldPath: '', value: '' },
  },
  {
    type: 'clear_field',
    label: 'Clear Field',
    description: 'Remove the value from a contact field.',
    icon: ClipboardX,
    defaultConfig: { fieldPath: '' },
  },
  {
    type: 'webhook',
    label: 'Webhook',
    description: 'Send data to an external URL.',
    icon: Webhook,
    defaultConfig: { url: '', method: 'POST' },
  },
  {
    type: 'branch',
    label: 'Branch (Split)',
    description: 'Split the workflow based on percentages.',
    icon: GitBranch,
    defaultConfig: { type: 'percentage_split', paths: [] },
  },
  {
    type: 'remove_from_workflow',
    label: 'Remove From Workflow',
    description: 'End the workflow for this contact.',
    icon: LogOut,
    defaultConfig: {}, // No config needed
  },
  // Add other action types here as needed
];

// Helper function to get config by type
export const getActionConfigByType = (type: ActionType): WorkflowActionUIDefinition | undefined => {
  return WORKFLOW_ACTIONS_CONFIG.find(action => action.type === type);
};

// Helper function to get default config by type
export const getDefaultConfigForAction = (type: ActionType): StepConfig | {} => {
  return getActionConfigByType(type)?.defaultConfig ?? {};
};
