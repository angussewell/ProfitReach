'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { Pencil, Trash2, HelpCircle } from 'lucide-react';
import { WorkflowStep } from '@/types/workflow';

function DefaultNode({ data, selected }: NodeProps) {
  const step = data as WorkflowStep;
  
  // Get a human-readable name for the step type
  const getStepTypeName = (actionType: string): string => {
    switch (actionType) {
      case 'wait': return 'Wait';
      case 'send_email': return 'Send Email';
      case 'update_field': return 'Update Field';
      case 'clear_field': return 'Clear Field';
      case 'webhook': return 'Webhook';
      case 'branch': return 'Branch';
      case 'remove_from_workflow': return 'Remove from Workflow';
      default: return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Generate a summary of the step configuration
  const getConfigSummary = (): string => {
    try {
      if (!step.config) return 'No configuration';
      
      if (typeof step.config === 'object') {
        // Try to extract some meaningful info based on action type
        switch (step.actionType) {
          case 'wait':
            if ('duration' in step.config && 'unit' in step.config) {
              return `Wait for ${step.config.duration} ${step.config.unit}`;
            }
            break;
          case 'branch':
            if ('type' in step.config && step.config.type === 'percentage_split' && 'paths' in step.config) {
              return `Split: ${(step.config.paths as any[]).map(p => `${p.weight}%`).join(', ')}`;
            }
            break;
          default:
            // For other types, show a generic summary
            return Object.entries(step.config)
              .slice(0, 2)
              .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.substring(0, 15) : v}`)
              .join(', ');
        }
      }
      
      return JSON.stringify(step.config).substring(0, 30);
    } catch (e) {
      return 'Configuration error';
    }
  };
  
  const handleEdit = () => {
    if (data.onEdit) data.onEdit(step);
  };
  
  const handleDelete = () => {
    if (data.onDelete) data.onDelete(step);
  };

  return (
    <div
      className={cn(
        "w-60 p-3 rounded-lg border-2 transition-all duration-200",
        "bg-gray-50",
        "border-gray-200",
        selected ? "ring-2 ring-blue-400" : "",
      )}
    >
      {/* Input handle */}
      <Handle
        id="target"
        type="target"
        position={Position.Top}
        className="w-3 h-3"
      />
      
      {/* Node header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-700">
          <HelpCircle className="h-5 w-5" />
        </div>
        <div className="font-medium text-gray-700">{getStepTypeName(step.actionType)}</div>
        <div className="ml-auto text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">#{step.order}</div>
      </div>
      
      {/* Node content */}
      <div className="text-sm text-gray-600">
        {getConfigSummary()}
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-end mt-2 gap-1">
        <button 
          onClick={handleEdit}
          className="p-1 text-gray-500 hover:text-gray-700 rounded"
        >
          <Pencil size={14} />
        </button>
        <button 
          onClick={handleDelete}
          className="p-1 text-red-500 hover:text-red-700 rounded"
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      {/* Output handle */}
      <Handle
        id="source"
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-400"
      />
    </div>
  );
}

export default memo(DefaultNode);
