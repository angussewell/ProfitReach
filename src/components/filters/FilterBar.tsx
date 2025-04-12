'use client';

import { Button } from '@/components/ui/button';
import { FilterCondition, FilterState, CONTACT_FIELDS } from '@/types/filters';
import { generateFilterId } from '@/lib/filter-utils';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import FilterConditionRow from './FilterConditionRow';
import { XCircle, Plus, Filter, SlidersHorizontal, Save } from 'lucide-react'; // Added Save icon
import SaveFilterModal from './SaveFilterModal'; // Added SaveFilterModal import

interface FilterBarProps {
  // Accept initial filter state from parent (e.g., when loading a saved filter)
  initialFilterState?: FilterState | null; 
  // Callback when filters are drafted/changed (without applying)
  onFiltersChange?: (filters: FilterState) => void; 
  // Callback when filters should be applied (explicit user action)
  onApplyFilters?: (filters: FilterState) => void;
  // Callback when filters are cleared
  onClearFilters?: () => void;
  // Callback specifically after a new filter is successfully saved
  onSaveFilterSuccess?: () => void;
  // Selected filter ID and name (for update mode)
  selectedFilterId?: string | null;
  selectedFilterName?: string | null;
  // Whether to show "draft" status indicator
  hasPendingChanges?: boolean;
}

export default function FilterBar({ 
  initialFilterState, 
  onFiltersChange, 
  onApplyFilters,
  onClearFilters,
  onSaveFilterSuccess,
  selectedFilterId,
  selectedFilterName,
  hasPendingChanges
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Filter state
  const [filterState, setFilterState] = useState<FilterState>({
    conditions: [],
    logicalOperator: 'AND'
  });
  
  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Load filters from initial prop or URL on component mount/prop change
  useEffect(() => {
    let loadedState: FilterState | null = null;
    if (initialFilterState) {
      // Prioritize initial state passed via prop
      loadedState = initialFilterState;
    } else {
      // Fallback to URL if no initial state provided
      const filtersParam = searchParams.get('filters');
      if (filtersParam) {
        try {
          loadedState = JSON.parse(decodeURIComponent(filtersParam));
        } catch (e) {
          console.error('Error parsing filters from URL:', e);
          loadedState = null; // Reset on error
        }
      }
    }

    // Set the state based on what was loaded
    const finalState = loadedState || { conditions: [], logicalOperator: 'AND' };
    setFilterState(finalState);

    // Expand filter UI if we have filters
    setIsExpanded(finalState.conditions.length > 0);

    // Notify parent if provided (optional, as parent might already know)
    // if (onFiltersChange) {
    //   onFiltersChange(finalState);
    // }

  }, [initialFilterState, searchParams /*, onFiltersChange */]); // Rerun if initial state changes
  
  // Note: We're not automatically updating the URL anymore when filters change
  // This will only happen when explicitly applying filters
  const updateURL = useCallback((newFilters: FilterState) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newFilters.conditions.length === 0) {
      params.delete('filters');
    } else {
      params.set('filters', encodeURIComponent(JSON.stringify(newFilters)));
    }
    
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);
  
  // Add a new filter condition
  const addFilterCondition = () => {
    const newCondition: FilterCondition = {
      id: generateFilterId(),
      field: CONTACT_FIELDS[0].name,
      operator: 'equals',
      value: ''
    };
    
    const newState = {
      ...filterState,
      conditions: [...filterState.conditions, newCondition]
    };
    
    setFilterState(newState);
    
    // Notify parent if provided
    if (onFiltersChange) {
      onFiltersChange(newState);
    }
    
    // Make sure UI is expanded
    setIsExpanded(true);
  };
  
  // Remove a filter condition
  const removeFilterCondition = (id: string) => {
    const newState = {
      ...filterState,
      conditions: filterState.conditions.filter(condition => condition.id !== id)
    };
    
    setFilterState(newState);
    updateURL(newState);
    
    // Notify parent if provided
    if (onFiltersChange) {
      onFiltersChange(newState);
    }
  };
  
  // Update a filter condition
  const updateFilterCondition = (id: string, updates: Partial<FilterCondition>) => {
    const newState = {
      ...filterState,
      conditions: filterState.conditions.map(condition => 
        condition.id === id 
          ? { ...condition, ...updates } 
          : condition
      )
    };
    
    setFilterState(newState);
    
    // Notify parent if provided
    if (onFiltersChange) {
      onFiltersChange(newState);
    }
  };
  
  // Toggle logical operator (AND/OR)
  const toggleLogicalOperator = () => {
    const newLogicalOperator = filterState.logicalOperator === 'AND' ? 'OR' : 'AND';
    const newState: FilterState = {
      ...filterState,
      logicalOperator: newLogicalOperator
    };
    
    setFilterState(newState);
    
    // Notify parent if provided
    if (onFiltersChange) {
      onFiltersChange(newState);
    }
  };
  
  // Apply filters - update URL and notify parent
  const applyFilters = () => {
    updateURL(filterState);
  };
  
  // Clear all filters
  const clearFilters = () => {
    const newState: FilterState = {
      conditions: [],
      logicalOperator: 'AND'
    };
    
    setFilterState(newState);
    
    // Notify parent if provided
    if (onFiltersChange) {
      onFiltersChange(newState);
    }
    
    // Call the separate onClearFilters callback if provided
    if (onClearFilters) {
      onClearFilters();
    } else {
      // Fall back to updating URL if no callback provided
      updateURL(newState);
    }
  };
  
  // Number of active filters
  const activeFilterCount = filterState.conditions.length;
  
  // If the filter UI is collapsed, just show the Add Filter button
  if (!isExpanded) {
    return (
      <div className="mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1"
        >
          <Filter className="h-4 w-4 mr-1" />
          {activeFilterCount > 0 ? (
            <>
              <span>Filters</span>
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                {activeFilterCount}
              </span>
            </>
          ) : (
            <span>Add Filter</span>
          )}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="mb-6 border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <SlidersHorizontal className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="text-sm font-medium text-gray-700">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button 
          className="text-gray-400 hover:text-gray-500"
          onClick={() => setIsExpanded(false)}
          aria-label="Collapse filter panel"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>
      
      {filterState.conditions.length > 0 && (
        <div className="space-y-3 mb-3">
          {filterState.conditions.map((condition, index) => (
            <div key={condition.id} className="flex items-start">
              {index > 0 && (
                <div className="px-2 py-2 text-xs font-medium text-gray-500 uppercase w-10">
                  {filterState.logicalOperator}
                </div>
              )}
              
              <div className="flex-grow">
                <FilterConditionRow
                  condition={condition}
                  onChange={(updates: Partial<FilterCondition>) => updateFilterCondition(condition.id, updates)}
                  onRemove={() => removeFilterCondition(condition.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={addFilterCondition}
          className="text-xs flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Add Filter
        </Button>
        
        {filterState.conditions.length >= 2 && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLogicalOperator}
            className="text-xs"
          >
            Match {filterState.logicalOperator === 'AND' ? 'all' : 'any'} (using {filterState.logicalOperator})
          </Button>
        )}
        
        <div className="flex-grow"></div>

        {filterState.conditions.length > 0 && (
          <>
            {/* Save Filter Button - Wrapped by Modal */}
            <SaveFilterModal 
              currentFilters={filterState}
              isDisabled={activeFilterCount === 0}
              onSaveSuccess={() => {
                // Trigger the callback passed from the parent page
                if (onSaveFilterSuccess) {
                  onSaveFilterSuccess();
                }
              }}
              selectedFilterId={selectedFilterId}
              selectedFilterName={selectedFilterName}
            >
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex items-center gap-1"
                disabled={activeFilterCount === 0}
              >
                <Save className="h-3 w-3" />
                Save View
              </Button>
            </SaveFilterModal>

            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              Clear Filters
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                // First update internal state
                applyFilters();
                
                // Then notify parent to apply these filters
                if (onApplyFilters) {
                  onApplyFilters(filterState);
                }
              }}
              className="text-xs relative"
            >
              {hasPendingChanges && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
              )}
              Apply Filters
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
