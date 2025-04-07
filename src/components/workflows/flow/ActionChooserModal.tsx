'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { WORKFLOW_ACTIONS_CONFIG, WorkflowActionUIDefinition } from './workflowActionsConfig';
import { ActionType } from '@/types/workflow';
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea

interface ActionChooserModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectAction: (actionType: ActionType) => void;
}

export function ActionChooserModal({
  isOpen,
  onOpenChange,
  onSelectAction,
}: ActionChooserModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Reset search term when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleSelect = (actionType: ActionType) => {
    onSelectAction(actionType);
    onOpenChange(false); // Close modal on selection
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-0"> {/* Remove padding for Command */}
        <Command className="rounded-lg border shadow-md">
          <DialogHeader className="p-6 pb-2"> {/* Add padding back to header */}
            <DialogTitle>Choose an Action</DialogTitle>
            <DialogDescription>
              Select the next step to add to your workflow.
            </DialogDescription>
          </DialogHeader>
          <CommandInput
            placeholder="Search actions..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="mx-4 mb-2 h-9" // Add margin
          />
          <ScrollArea className="h-[300px]"> {/* Make list scrollable */}
            <CommandList className="p-4 pt-0"> {/* Add padding to list */}
              <CommandEmpty>No actions found.</CommandEmpty>
              <CommandGroup>
                {WORKFLOW_ACTIONS_CONFIG.map((action: WorkflowActionUIDefinition) => (
                  <CommandItem
                    key={action.type}
                    value={`${action.label} ${action.description} ${action.type}`} // Include more text for searching
                    onSelect={() => handleSelect(action.type)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <action.icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-medium">{action.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </ScrollArea>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
