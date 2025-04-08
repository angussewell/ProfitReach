'use client';

'use client'; // Ensure this is a client component

import React from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Loader2, ArrowLeft } from 'lucide-react'; // Added ArrowLeft
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
  onCancel, // Keep this if it has specific unsaved changes logic
  isSaving,
  isLoading,
  isCreating,
}: WorkflowEditorHeaderProps) {
  const router = useRouter(); // Initialize router

  const handleGoBack = () => {
    router.push('/workflows'); // Navigate to the workflows list page
  };

  return (
    <header className="sticky top-0 z-10 flex h-[57px] items-center gap-4 border-b bg-background px-4">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleGoBack} 
        aria-label="Back to Workflows"
        disabled={isSaving} // Disable if saving
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Workflow Name Input */}
      <div className="flex-1 ml-2"> {/* Added margin for spacing */}
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
        {/* Settings Button - Kept as is */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSettings}
          disabled={isLoading || isSaving}
          className="gap-1"
          aria-label="Workflow Settings"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>

        {/* Cancel Button - Kept as is, assuming it might handle unsaved changes */}
        {/* If not, it could be removed or merged with the Back button logic */}
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel} 
          disabled={isSaving}
        >
          Cancel 
        </Button>

        {/* Save Button - Kept as is */}
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
