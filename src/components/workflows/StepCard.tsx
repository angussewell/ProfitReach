'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Clock, Mail, ClipboardEdit, ClipboardX, Webhook, GitBranch, 
  LogOut, ArrowUp, ArrowDown, Pencil, Trash2, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
// BranchConfig removed
import { ActionType, WorkflowStep, UpdateFieldConfig } from '@/types/workflow';
import { Badge } from '@/components/ui/badge';

// Action type to icon mapping - 'branch' removed
const actionTypeIcons: Record<ActionType, React.ReactNode> = {
  wait: <Clock className="h-4 w-4" />,
  send_email: <Mail className="h-4 w-4" />,
  update_field: <ClipboardEdit className="h-4 w-4" />,
  clear_field: <ClipboardX className="h-4 w-4" />,
  webhook: <Webhook className="h-4 w-4" />,
  // branch removed
  remove_from_workflow: <LogOut className="h-4 w-4" />,
  scenario: <MessageSquare className="h-4 w-4" />,
};

// Action type to color mapping for visual distinction - 'branch' removed
const actionTypeColors: Record<ActionType, { bg: string, border: string, text: string }> = {
  wait: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  send_email: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  update_field: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  clear_field: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  webhook: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
  // branch removed
  remove_from_workflow: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  scenario: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
};

// Action type labels - 'branch' removed
const actionTypeLabels: Record<ActionType, string> = {
  wait: 'Wait',
  send_email: 'Send Email',
  update_field: 'Update Field',
  clear_field: 'Clear Field',
  webhook: 'Webhook',
  // branch removed
  remove_from_workflow: 'Remove From Workflow',
  scenario: 'Scenario',
};

interface StepCardProps {
  step: WorkflowStep;
  isFirst: boolean;
  isLast: boolean;
  // indentLevel removed
  index: number;
  allSteps: WorkflowStep[]; // Keep for context if needed, e.g., delete confirmation
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  className?: string;
}

// Helper for generating step summaries
function generateStepSummary(step: WorkflowStep, allSteps: WorkflowStep[]): string {
  const { actionType, config } = step;
  
  switch (actionType) {
    case 'wait':
      if (typeof config === 'object' && 'duration' in config && 'unit' in config) {
        return `Wait for ${config.duration} ${config.unit}`;
      }
      return 'Wait for some time';
      
    case 'send_email':
      if (typeof config === 'object' && 'scenarioId' in config) {
        if (config.scenarioId) {
          return `Send scenario #${config.scenarioId?.substring(0, 8)}`;
        }
      }
      return 'Send email';
    case 'update_field': {
      // Type guard for the new config structure
      const isUpdateConfig = (c: any): c is UpdateFieldConfig =>
        typeof c === 'object' && c !== null && 'fieldPath' in c && 'assignmentType' in c && Array.isArray(c.values);

      if (isUpdateConfig(config)) {
        const fieldName = config.fieldPath?.split('.').pop() || 'field';
        // Check assignmentType directly now
        if (config.assignmentType === 'random_pool') {
           // Ensure we only show pool summary if there are actually multiple values
           const validValuesCount = config.values.filter(v => v !== '').length;
           if (validValuesCount > 1) {
             return `Set ${fieldName} randomly from pool (${validValuesCount} values)`;
           } else {
             // Fallback to single display if only 0 or 1 valid values despite 'random_pool' type
             const displayValue = config.values.find(v => v !== '') || '""';
             return `Set ${fieldName} to "${displayValue}"`;
           }
        } else { // assignmentType === 'single'
          const displayValue = config.values[0] || '""'; // Show first value or empty quotes
          return `Set ${fieldName} to "${displayValue}"`;
        }
      }
      return 'Update a field'; // Fallback if config is not valid UpdateFieldConfig
    }
    case 'clear_field':
      if (typeof config === 'object' && 'fieldPath' in config) {
        const fieldName = config.fieldPath?.split('.').pop() || 'field';
        return `Clear ${fieldName}`;
      }
      return 'Clear a field';

    case 'webhook':
      if (typeof config === 'object' && config && 'url' in config && typeof config.url === 'string' && config.url) {
        try {
          // Attempt to construct the URL
          const url = new URL(config.url);
          // If successful, return the hostname
          return `POST to ${url.hostname}`;
        } catch (error) {
          // If URL construction fails, return an error message
          console.warn(`Invalid URL in webhook config: ${config.url}`, error);
          return 'Call Webhook: Invalid URL';
        }
      }
      // If config is invalid or URL is missing/empty, return default
      return 'Call Webhook';

    // 'branch' case removed

    case 'remove_from_workflow':
      return 'End workflow for contact';
      
    case 'scenario':
      if (typeof config === 'object' && 'scenarioIds' in config && Array.isArray(config.scenarioIds)) {
        const scenarioIds = config.scenarioIds;
        if (scenarioIds.length === 0) {
          return 'No scenarios selected';
        } else if (scenarioIds.length === 1) {
          // For single scenario, show ID until we fetch the name
          return `Set Contact Scenario to selected template`;
        } else {
          return `Set Contact Scenario randomly from pool (${scenarioIds.length} templates)`;
        }
      }
      return 'Configure scenarios...';

    default:
      return 'Configure step...';
  }
}

/**
 * Compact, fixed-width card component for displaying a workflow step
 */
export function StepCard({
  step,
  isFirst,
  isLast,
  // indentLevel removed
  index,
  allSteps, // Keep for summary context if needed
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  className,
}: StepCardProps) {
  const { actionType, order, customName } = step;
  const colors = actionTypeColors[actionType];

  // indentClass removed

  return (
    // Simplified positioning, remove relative positioning needed for connector lines
    <div className={cn('py-4', className)}> {/* Increased padding for better spacing */}
      {/* Connector lines removed for cleaner interface */}

      {/* Step Card - Compact, fixed-width */}
      <Card className={cn(
        'w-64 shadow-sm transition-all duration-200 hover:shadow-md mx-auto', // Center card
        colors.bg, 'border-l-4', colors.border
      )}>
        <CardHeader className="p-3 flex flex-row justify-between items-center space-y-0">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("rounded-full h-6 w-6 p-1 flex items-center justify-center", colors.text)}
            >
              {order}
            </Badge>
            <div className="flex flex-col">
              <span className={cn("font-medium text-sm flex items-center gap-1", colors.text)}>
                {actionTypeIcons[actionType]}
                {customName || actionTypeLabels[actionType]}
              </span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 pt-0">
          <div className="text-xs bg-white/80 p-2 rounded border border-gray-100 text-gray-700">
            {generateStepSummary(step, allSteps)}
          </div>
          
          {/* Action buttons row */}
          <div className="flex justify-end gap-1 mt-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onMoveUp(index)} // Wrap in function call with index
              disabled={isFirst}
              title="Move Up"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onMoveDown(index)} // Wrap in function call with index
              disabled={isLast}
              title="Move Down"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onEdit(index)} // Keep index passing for edit/delete
              title="Edit Step"
            >
              <Pencil className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-600"
              onClick={() => onDelete(index)} // Keep index passing for edit/delete
              title="Delete Step"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connector lines completely removed for cleaner interface */}
    </div>
  );
}
