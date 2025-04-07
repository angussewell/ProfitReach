'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FilterState } from '@/types/filters';
import { useToast } from '@/components/ui/use-toast'; // Assuming you have a toast component setup

interface SaveFilterModalProps {
  children: React.ReactNode; // To wrap the trigger button
  currentFilters: FilterState;
  onSaveSuccess?: () => void; // Callback on success
  isDisabled?: boolean; // To disable the trigger
  selectedFilterId?: string | null; // ID of the selected filter (for update mode)
  selectedFilterName?: string | null; // Name of the selected filter (for update mode)
}

export default function SaveFilterModal({ 
  children, 
  currentFilters, 
  onSaveSuccess,
  isDisabled = false,
  selectedFilterId = null,
  selectedFilterName = null
}: SaveFilterModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Set initial filter name when opening in update mode
  useEffect(() => {
    if (isOpen && selectedFilterName) {
      setFilterName(selectedFilterName);
    }
  }, [isOpen, selectedFilterName]);

  const handleSave = async () => {
    if (!filterName.trim()) {
      setError('Filter name cannot be empty.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      // Determine if we're updating an existing filter or creating a new one
      const isUpdateMode = !!selectedFilterId;
      const url = isUpdateMode 
        ? `/api/saved-filters/${selectedFilterId}` 
        : '/api/saved-filters';
      
      const method = isUpdateMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: filterName.trim(), filters: currentFilters }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${isUpdateMode ? 'update' : 'save'} filter (status: ${response.status})`);
      }

      // Use the local filterName state for the toast message
      toast({
        title: 'Filter Saved',
        description: `"${filterName.trim()}" has been saved successfully.`,
      });
      
      setIsOpen(false); // Close modal on success
      setFilterName(''); // Reset name input
      // Call onSaveSuccess without data, as the parent will refresh the list
      if (onSaveSuccess) {
        onSaveSuccess(); 
      }

    } catch (err: any) {
      console.error('Save filter error:', err);
      setError(err.message || 'An unexpected error occurred.');
       toast({
        title: 'Error Saving Filter',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when modal opens or closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setFilterName('');
      setError(null);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild disabled={isDisabled}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{selectedFilterId ? 'Update Filter' : 'Save Current Filter View'}</DialogTitle>
          <DialogDescription>
            {selectedFilterId 
              ? 'Update this saved filter with the current set of conditions.' 
              : 'Enter a name for this set of filters to easily access it later.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="filter-name" className="text-right">
              Name
            </Label>
            <Input
              id="filter-name"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 'Qualified Leads in CA'"
              disabled={isLoading}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 col-span-4 text-center px-4">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave} disabled={isLoading || !filterName.trim()}>
            {isLoading ? 'Saving...' : selectedFilterId ? 'Update Filter' : 'Save Filter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
