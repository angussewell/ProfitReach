// src/components/workflows/utils/workflowUtils.ts
'use client';

import { ActionType, StepConfig } from '@/types/workflow';

// Branch-related utilities removed

/**
 * Returns the default configuration object for a given action type.
 */
export function getDefaultConfigForAction(actionType: ActionType): StepConfig | {} {
  switch (actionType) {
    case 'wait':
      return { duration: 1, unit: 'days' };
    case 'send_email':
      return { subjectOverride: '', scenarioId: '' };
    case 'update_field':
      // Updated default for update_field
      return { fieldPath: '', assignmentType: 'single', values: [''] };
    case 'clear_field':
      return { fieldPath: '' };
    case 'webhook':
      return { url: '', method: 'POST' };
    // 'branch' case removed
    case 'remove_from_workflow':
      return {}; // No config needed
    case 'scenario':
      return { assignmentType: 'single', scenarioIds: [] };
    default:
      // Should not happen with valid ActionType, but return empty object as fallback
      console.warn(`Unknown action type encountered in getDefaultConfigForAction: ${actionType}`);
      return {};
  }
}
