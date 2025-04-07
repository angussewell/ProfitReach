'use client';

import React from 'react';
import { WorkflowStep } from '@/types/workflow';

interface DebugDisplayProps {
  steps: WorkflowStep[];
  visible: boolean;
}

export default function DebugDisplay({ steps, visible }: DebugDisplayProps) {
  if (!visible) return null;
  
  return (
    <div className="border border-red-300 bg-red-50 p-4 mb-4 rounded-md">
      <h3 className="text-red-700 font-semibold mb-2">Debug: Workflow Steps ({steps.length})</h3>
      {steps.length === 0 ? (
        <p className="text-red-600">No steps available.</p>
      ) : (
        <div className="overflow-auto max-h-[300px] text-sm">
          <table className="w-full text-left">
            <thead className="bg-red-100">
              <tr>
                <th className="p-2 border border-red-200">Order</th>
                <th className="p-2 border border-red-200">ID</th>
                <th className="p-2 border border-red-200">Type</th>
                <th className="p-2 border border-red-200">Config</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <tr key={step.clientId} className="border-b border-red-200">
                  <td className="p-2 border border-red-200">{step.order}</td>
                  <td className="p-2 border border-red-200 font-mono text-xs">{step.clientId.substring(0, 8)}...</td>
                  <td className="p-2 border border-red-200">{step.actionType}</td>
                  <td className="p-2 border border-red-200 font-mono text-xs">
                    {JSON.stringify(step.config).substring(0, 60)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-2 text-xs text-red-600">
        This debug panel appears because React Flow is not displaying nodes correctly.
      </div>
    </div>
  );
}
