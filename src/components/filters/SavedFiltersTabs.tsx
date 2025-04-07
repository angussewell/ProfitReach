'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FilterState } from '@/types/filters';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Define the structure of a saved filter fetched from the API
interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState; // Assuming filters are stored as FilterState JSON
  createdAt: string;
  updatedAt: string;
}

interface SavedFiltersTabsProps {
  // Callback to apply the selected filter state or null to clear
  onSelectFilter: (filterState: FilterState | null) => void; 
  // Callback to refresh the list if a new filter is saved elsewhere
  refreshCounter?: number;
  // Selected filter ID and name to pass to parent for updating
  onFilterSelect?: (filterId: string | null, filterName?: string | null) => void;
}

export default function SavedFiltersTabs({ 
  onSelectFilter, 
  refreshCounter = 0,
  onFilterSelect,
}: SavedFiltersTabsProps) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('all'); // 'all' or saved filter ID
  const [filterToDelete, setFilterToDelete] = useState<SavedFilter | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchSavedFilters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/saved-filters');
      const result = await response.json();
      
      // Add detailed logging
      console.log('Saved filters API response:', response.status, response.statusText);
      console.log('Saved filters data:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch saved filters.');
      }
      
      // Debug if result.data exists and is array
      if (!Array.isArray(result.data)) {
        console.error('API response data is not an array:', result.data);
        setSavedFilters([]);
        return;
      }

      if (result.data.length === 0) {
        console.log('No saved filters found for current user.');
      }
      
      // Ensure filters property is parsed correctly if it's a string
      const parsedFilters = result.data.map((filter: any) => ({
        ...filter,
        filters: typeof filter.filters === 'string' ? JSON.parse(filter.filters) : filter.filters
      }));

      console.log('Parsed saved filters:', parsedFilters);
      setSavedFilters(parsedFilters);

    } catch (err: any) {
      console.error('Error fetching saved filters:', err);
      setError(err.message);
      toast({
        title: 'Error Loading Saved Filters',
        description: err.message || 'Could not load saved views.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch filters on mount and when refreshCounter changes
  useEffect(() => {
    fetchSavedFilters();
  }, [fetchSavedFilters, refreshCounter]);

  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    
    if (value === 'all') {
      onSelectFilter(null); // Signal to clear filters
      // Notify parent that no filter is selected (for update/edit mode)
      if (onFilterSelect) onFilterSelect(null);
    } else {
      const selected = savedFilters.find(f => f.id === value);
      if (selected) {
        onSelectFilter(selected.filters); // Pass the FilterState object
        // Notify parent which filter is selected (for update/edit mode)
        if (onFilterSelect) onFilterSelect(selected.id, selected.name);
      }
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, filter: SavedFilter) => {
    e.stopPropagation(); // Prevent tab selection when clicking delete
    setFilterToDelete(filter);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!filterToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/saved-filters/${filterToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete filter');
      }

      toast({
        title: 'Filter Deleted',
        description: `"${filterToDelete.name}" has been deleted.`,
      });

      // If we deleted the selected filter, switch to "All Contacts"
      if (selectedTab === filterToDelete.id) {
        setSelectedTab('all');
        onSelectFilter(null);
        if (onFilterSelect) onFilterSelect(null);
      }

      // Refresh the list
      fetchSavedFilters();
    } catch (err: any) {
      console.error('Error deleting filter:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete filter',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setFilterToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mb-4 flex space-x-2">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>
    );
  }

  if (error) {
    // Optionally render an error message, or just log it
    // For now, we just won't render the tabs if there's an error
    return null; 
  }

  // Only render tabs if there are saved filters
  if (savedFilters.length === 0) {
      // For development, show a small indicator that we checked but found no filters
      return (
        <div className="mb-4 text-xs text-gray-400">
          No saved views found. {error ? `Error: ${error}` : ''}
          <button 
            onClick={fetchSavedFilters}
            className="ml-2 text-blue-500 hover:underline"
          >
            Refresh
          </button>
        </div>
      );
  }

  return (
    <>
      <div className="mb-4 border-b">
        <Tabs value={selectedTab} onValueChange={handleTabChange}>
          <TabsList className="bg-transparent p-0 h-auto -mb-px">
            {/* Default "All Contacts" Tab */}
            <TabsTrigger 
              value="all" 
              className="pb-2 px-3 text-sm rounded-t-md border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-blue-50"
            >
              All Contacts
            </TabsTrigger>

            {/* Saved Filter Tabs */}
            {savedFilters.map((filter) => (
              <TabsTrigger 
                key={filter.id} 
                value={filter.id}
                className="group pb-2 px-3 text-sm rounded-t-md border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-blue-50 relative"
              >
                {filter.name}
                <span 
                  className="ml-1.5 opacity-0 group-hover:opacity-100 inline-flex items-center transition-opacity duration-200"
                  onClick={(e) => handleDeleteClick(e, filter)}
                >
                  <XCircle size={14} className="text-gray-500 hover:text-red-500" />
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Saved Filter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{filterToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
