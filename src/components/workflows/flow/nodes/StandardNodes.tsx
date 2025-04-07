'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import {
  Clock, Mail, ClipboardEdit, ClipboardX, Webhook, LogOut
} from 'lucide-react';
import BaseStepNode from './BaseStepNode';
import {
  WaitConfig,
  SendEmailConfig,
  UpdateFieldConfig,
  ClearFieldConfig,
  WebhookConfig,
  RemoveFromWorkflowConfig
} from '@/types/workflow';

// Wait Node
function WaitNode(props: NodeProps) {
  const config = props.data.config as WaitConfig;
  
  const getSummary = () => {
    return `Wait for ${config?.duration || '?'} ${config?.unit || 'units'}`;
  };

  return (
    <BaseStepNode
      {...props}
      icon={<Clock className="h-5 w-5" />}
      label="Wait"
      summary={getSummary()}
      color={{
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700'
      }}
    />
  );
}

// Email Node
function EmailNode(props: NodeProps) {
  const config = props.data.config as SendEmailConfig;
  
  const getSummary = () => {
    return `Send Email ${config?.scenarioId ? `(Scenario: ${config.scenarioId})` : ''} ${config?.subjectOverride ? `(Subject: ${config.subjectOverride.substring(0, 20)}...)` : ''}`;
  };

  return (
    <BaseStepNode
      {...props}
      icon={<Mail className="h-5 w-5" />}
      label="Send Email"
      summary={getSummary()}
      color={{
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700'
      }}
    />
  );
}

// Update Field Node
function UpdateFieldNode(props: NodeProps) {
  const config = props.data.config as UpdateFieldConfig;
  
  const getSummary = () => {
    return `Set ${config?.fieldPath || '?'} to "${(config?.value || '').substring(0, 20)}${config?.value?.length > 20 ? '...' : ''}"`;
  };

  return (
    <BaseStepNode
      {...props}
      icon={<ClipboardEdit className="h-5 w-5" />}
      label="Update Field"
      summary={getSummary()}
      color={{
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700'
      }}
    />
  );
}

// Clear Field Node
function ClearFieldNode(props: NodeProps) {
  const config = props.data.config as ClearFieldConfig;
  
  const getSummary = () => {
    return `Clear ${config?.fieldPath || '?'}`;
  };

  return (
    <BaseStepNode
      {...props}
      icon={<ClipboardX className="h-5 w-5" />}
      label="Clear Field"
      summary={getSummary()}
      color={{
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700'
      }}
    />
  );
}

// Webhook Node
function WebhookNode(props: NodeProps) {
  const config = props.data.config as WebhookConfig;
  
  const getSummary = () => {
    return `Call Webhook: ${config?.method || '?'} ${config?.url ? config.url.substring(0, 25) + '...' : '?'}`;
  };

  return (
    <BaseStepNode
      {...props}
      icon={<Webhook className="h-5 w-5" />}
      label="Webhook"
      summary={getSummary()}
      color={{
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        text: 'text-indigo-700'
      }}
    />
  );
}

// Remove from Workflow Node
function RemoveNode(props: NodeProps) {
  const getSummary = () => {
    return 'Remove contact from workflow';
  };

  return (
    <BaseStepNode
      {...props}
      icon={<LogOut className="h-5 w-5" />}
      label="Remove From Workflow"
      summary={getSummary()}
      color={{
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700'
      }}
    />
  );
}

// Export all nodes
export const WaitNodeComponent = memo(WaitNode);
export const EmailNodeComponent = memo(EmailNode);
export const UpdateFieldNodeComponent = memo(UpdateFieldNode);
export const ClearFieldNodeComponent = memo(ClearFieldNode);
export const WebhookNodeComponent = memo(WebhookNode);
export const RemoveNodeComponent = memo(RemoveNode);
