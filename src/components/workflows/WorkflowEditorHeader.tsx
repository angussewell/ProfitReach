'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowEditorHeaderProps {
  workflowName: string;
  onWorkflowNameChange: (newName: string) => void;
  onToggleSettings: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isLoading: boolean; // To disable inputs/buttons while loading initial data
  isCreating: boolean; // To adjust button text/behavior
}

export function WorkflowEditorHeader({
  workflowName,
  onWorkflowNameChange,
  onToggleSettings,
  onSave,
  onCancel,
  isSaving,
  isLoading,
  isCreating,
}: WorkflowEditorHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-[57px] items-center gap-4 border-b bg-background px-4">
      {/* Workflow Name Input */}
      <div className="flex-1">
        <Input
          type="text"
          placeholder="Enter Workflow Name..."
          value={workflowName}
          onChange={(e) => onWorkflowNameChange(e.target.value)}
          className={cn(
            "text-xl font-semibold border-none shadow-none focus-visible:ring-0 h-auto p-0",
            !workflowName && "text-muted-foreground" // Style placeholder differently if needed
          )}
          disabled={isLoading || isSaving}
        />
        {/* Maybe add a small pencil icon or similar indicator for editability */}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSettings}
          disabled={isLoading || isSaving} // Allow opening settings even when creating
          className="gap-1"
          aria-label="Workflow Settings"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>

        <Button
          size="sm"
          onClick={onSave}
          disabled={isLoading || isSaving || !workflowName} // Disable save if no name or loading/saving
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            isCreating ? 'Create & Save' : 'Save Workflow'
          )}
        </Button>
        {/* Add Publish button later if needed */}
      </div>
    </header>
  );
}
