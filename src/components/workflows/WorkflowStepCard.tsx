'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUp, ArrowDown, Pencil, Trash2, Plus,
  Clock, Mail, ClipboardEdit, ClipboardX, Webhook, GitBranch, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionType, WorkflowStep } from '@/types/workflow';

// Define action type to icon mapping
const actionTypeIcons: Record<ActionType, React.ReactNode> = {
  wait: <Clock className="h-5 w-5" />,
  send_email: <Mail className="h-5 w-5" />,
  update_field: <ClipboardEdit className="h-5 w-5" />,
  clear_field: <ClipboardX className="h-5 w-5" />,
  webhook: <Webhook className="h-5 w-5" />,
  branch: <GitBranch className="h-5 w-5" />,
  remove_from_workflow: <LogOut className="h-5 w-5" />,
};

// Action type to color mapping
const actionTypeColors: Record<ActionType, { bg: string, border: string, text: string }> = {
  wait: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  send_email: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  update_field: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  clear_field: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  webhook: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
  branch: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  remove_from_workflow: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
};

// Action type labels
const actionTypeLabels: Record<ActionType, string> = {
  wait: 'Wait',
  send_email: 'Send Email',
  update_field: 'Update Field',
  clear_field: 'Clear Field',
  webhook: 'Webhook',
  branch: 'Branch (Split)',
  remove_from_workflow: 'Remove From Workflow',
};

export interface WorkflowStepCardProps {
  step: WorkflowStep;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddAfter: () => void;
  isFirst: boolean;
  isLast: boolean;
  isBranchTarget?: boolean;
  branchLevel?: number;
}

export function WorkflowStepCard({
  step,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddAfter,
  isFirst,
  isLast,
  isBranchTarget = false,
  branchLevel = 0,
}: WorkflowStepCardProps) {
  const { actionType, order, config } = step;
  const colors = actionTypeColors[actionType];
  
  // Generate config summary
  const getConfigSummary = (): string => {
    const conf = config as any; // Use 'any' for simplicity here
    switch (actionType) {
      case 'wait':
        return `Wait for ${conf?.duration || '?'} ${conf?.unit || 'units'}`;
      case 'send_email':
        return `Send Email ${conf.scenarioId ? `(Scenario: ${conf.scenarioId})` : ''} ${conf.subjectOverride ? `(Subject: ${conf.subjectOverride.substring(0, 20)}...)` : ''}`;
      case 'update_field':
        return `Set ${conf.fieldPath || '?'} to "${(conf.value || '').substring(0, 20)}${conf.value?.length > 20 ? '...' : ''}"`;
      case 'clear_field':
        return `Clear ${conf.fieldPath || '?'}`;
      case 'webhook':
        return `Call Webhook: ${conf.method || '?'} ${conf.url ? conf.url.substring(0, 25) + '...' : '?'}`;
      case 'branch':
        if (conf.type === 'percentage_split') {
          return `Split: ${conf.paths.map((p: any, i: number) => `${p.weight}% to Step #${p.nextStepOrder}`).join(', ')}`;
        }
        return 'Branch: Configure percentage split';
      case 'remove_from_workflow':
        return 'Remove contact from workflow';
      default:
        return 'Unknown action';
    }
  };

  return (
    <div className={cn("relative mb-2", branchLevel > 0 && "ml-8")}>
      {/* Step connector line (coming from above) */}
      {!isFirst && !isBranchTarget && (
        <div className="absolute top-0 left-6 w-0.5 h-4 -mt-4 bg-gray-300 z-0"></div>
      )}
      
      {/* Branch connector (horizontal line for branch targets) */}
      {isBranchTarget && (
        <div className="absolute top-1/2 -left-8 w-8 h-0.5 bg-gray-300"></div>
      )}
      
      {/* Add step button above */}
      {!isFirst && !isBranchTarget && (
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute -top-4 left-4 w-4 h-4 rounded-full bg-white border border-gray-200 hover:bg-gray-100 z-10"
          onClick={onAddAfter}
        >
          <Plus className="h-3 w-3" />
        </Button>
      )}
      
      <Card className={cn(
        "border-l-4 relative",
        colors.border,
        colors.bg,
        "transition-all duration-200 hover:shadow-md"
      )}>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn("rounded-full h-8 w-8 p-1.5 flex items-center justify-center", colors.text)}
            >
              {order}
            </Badge>
            
            <div className="flex items-center gap-2">
              <span className={cn(colors.text)}>
                {actionTypeIcons[actionType]}
              </span>
              <span className="font-medium">{actionTypeLabels[actionType]}</span>
            </div>
            
            <div className="flex-grow"></div>
            
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={isFirst} title="Move Up">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={isLast} title="Move Down">
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onEdit} title="Edit Step">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="text-red-500 hover:text-red-600"
                title="Delete Step"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="mt-2 text-sm text-muted-foreground">
            {getConfigSummary()}
          </div>
        </div>
      </Card>
      
      {/* Step connector line (to below) */}
      {!isLast && (
        <div className="absolute bottom-0 left-6 w-0.5 h-6 -mb-2 bg-gray-300 z-0"></div>
      )}
      
      {/* Add step button below */}
      {!isLast && (
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute -bottom-4 left-4 w-4 h-4 rounded-full bg-white border border-gray-200 hover:bg-gray-100 z-10"
          onClick={onAddAfter}
        >
          <Plus className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
