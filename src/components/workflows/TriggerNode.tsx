'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Removed onAddFirstStep from props
interface TriggerNodeProps {
  className?: string;
}

/**
 * TriggerNode represents the start of the workflow (non-editable)
 */
// Removed onAddFirstStep from destructuring
export function TriggerNode({ className }: TriggerNodeProps) {
  return (
    <Card className={cn(
      'w-64 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200', // Increased width to match step cards
      'shadow-sm hover:shadow transition-shadow duration-200 mx-auto', // Added mx-auto for horizontal centering
      className
    )}>
      <CardContent className="p-3 flex flex-col items-center justify-center">
        <div className="h-10 w-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center mb-2">
          <Zap className="h-5 w-5 text-indigo-600" />
        </div>
        <p className="text-sm font-medium text-indigo-700">Workflow Trigger</p>
        <p className="text-xs text-indigo-500 mt-1">Contact added to workflow</p>
        
        {/* Add step button removed */}
      </CardContent>
    </Card>
  );
}
