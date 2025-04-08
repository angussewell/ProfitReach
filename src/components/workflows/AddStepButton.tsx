'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddStepButtonProps {
  onClick: () => void;
  indentClass?: string;
  showVerticalLine?: boolean;
  pathIndex?: number; // For branch paths
  isLastInPath?: boolean;
  className?: string;
}

/**
 * Reusable button for adding steps in the workflow
 */
export function AddStepButton({
  onClick,
  indentClass = '',
  showVerticalLine = true,
  pathIndex,
  isLastInPath = false,
  className
}: AddStepButtonProps) {
  return (
    <div className={cn('py-4', indentClass, className)}>
      {/* Vertical connector line removed for cleaner interface */}
      
      <div className="flex justify-center items-center">
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center gap-1"
          onClick={onClick}
        >
          <Plus className="h-3 w-3" /> Add Step Here
        </Button>
      </div>
    </div>
  );
}
