'use client';

import React, { useState } from 'react'; // Added React import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, FilterOperator } from '@/types/filters';
import { createFilter } from '@/lib/filter-utils';
import { X, Plus } from 'lucide-react'; // Removed ChevronDown as it's handled by SearchableSelect
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select'; // Import SearchableSelect

interface FilterGroupProps {
  filters: Filter[];
  fields: string[];
  onUpdate: (filters: Filter[]) => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

function FilterGroupComponent({ filters, fields, onUpdate, onDelete, showDelete }: FilterGroupProps) {
  // Corrected operator names to match FilterOperator type (camelCase)
  const operators: FilterOperator[] = ['exists', 'not exists', 'equals', 'notEquals', 'contains', 'notContains'];
  
  // Map fields to the format required by SearchableSelect
  const fieldOptions = fields.map(field => ({ value: field, label: field }));

  const addFilter = () => {
    const newFilter = createFilter(fields[0], 'exists');
    onUpdate([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    const updatedFilters = filters.filter(f => f.id !== id);
    onUpdate(updatedFilters);
  };

  const updateFilter = (id: string, updates: Partial<Filter>) => {
    const updatedFilters = filters.map(filter => 
      filter.id === id ? { ...filter, ...updates } : filter
    );
    onUpdate(updatedFilters);
  };

  return (
    <div className="space-y-4 p-4 border-2 border-gray-200 rounded-lg">
      {filters.map((filter, index) => (
        <div key={filter.id}>
          <div className="flex items-center gap-2">
            {/* Field selector - Replaced with SearchableSelect */}
            <SearchableSelect
              options={fieldOptions}
              value={filter.field}
              onChange={(selectedValue) => updateFilter(filter.id, { field: selectedValue })}
              placeholder="Select field..."
              // Apply styling to match other inputs
              // Note: SearchableSelect renders a Button trigger. We style that button.
              // The component itself doesn't take className directly for the trigger.
              // We might need to adjust SearchableSelect or wrap it if direct styling isn't enough.
              // For now, relying on SearchableSelect's internal Button styling + potential overrides.
              // Let's assume SearchableSelect's Button uses `h-12` and appropriate border/focus styles,
              // or we adjust it later if needed after visual inspection.
              // The base SearchableSelect uses `variant="outline"` and `w-full justify-between`.
              // We need to ensure height and border consistency.
              // TODO: Verify styling after implementation. Add wrapper div with classes if needed.
            />

            {/* Operator selector - Unchanged */}
            <select
              value={filter.operator}
              onChange={(e) => {
                const value = e.target.value as FilterOperator;
                updateFilter(filter.id, { 
                  operator: value,
                  value: value === 'exists' || value === 'not exists' ? undefined : filter.value 
                });
              }}
              className="flex w-full items-center justify-between bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg"
            >
              {operators.map(op => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>

            {/* Value input for operators that need it - corrected operator names */}
            {(filter.operator === 'equals' || filter.operator === 'notEquals' || 
              filter.operator === 'contains' || filter.operator === 'notContains') && (
              <Input
                type="text"
                value={filter.value || ''}
                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                placeholder="Value..."
                className="w-full h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg"
              />
            )}

            {/* Remove filter button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeFilter(filter.id)}
              className="h-12 w-12 border-2 border-gray-200 hover:border-[#ff7a59] transition-all rounded-lg flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {index < filters.length - 1 && (
            <div className="flex items-center justify-center my-2">
              <span className="text-sm font-medium text-gray-500">AND</span>
            </div>
          )}
        </div>
      ))}
      
      <div className="flex justify-between items-center mt-4">
        <Button 
          type="button"
          onClick={addFilter} 
          variant="outline" 
          size="sm" 
          className="h-10 px-4 text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Condition
        </Button>
        {showDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-10 px-4 text-sm text-red-500 hover:text-red-600"
          >
            <X className="w-4 h-4 mr-2" />
            Remove Group
          </Button>
        )}
      </div>
    </div>
  );
}

interface FilterBuilderProps {
  initialFilters?: Filter[];
  fields: string[];
  onChange: (filters: Filter[]) => void;
}

export function FilterBuilder({ initialFilters = [], fields, onChange }: FilterBuilderProps) {
  const [groups, setGroups] = useState<Filter[][]>(() => {
    // Convert flat filter list to groups based on group property
    if (initialFilters.length === 0) return [[]];
    
    // Group filters by their group property
    const groupedFilters = initialFilters.reduce((acc, filter) => {
      const groupId = filter.group || 'default';
      if (!acc[groupId]) acc[groupId] = [];
      acc[groupId].push(filter);
      return acc;
    }, {} as Record<string, Filter[]>);
    
    return Object.values(groupedFilters);
  });

  const updateGroup = (index: number, filters: Filter[]) => {
    const newGroups = [...groups];
    // Assign group IDs to filters in this group
    const groupId = Math.random().toString(36).substr(2, 9);
    const filtersWithGroup = filters.map(f => ({ ...f, group: groupId }));
    newGroups[index] = filtersWithGroup;
    setGroups(newGroups);
    // Flatten groups but preserve group information
    onChange(newGroups.flat());
  };

  const addGroup = () => {
    setGroups([...groups, []]);
  };

  const removeGroup = (index: number) => {
    const newGroups = groups.filter((_, i) => i !== index);
    if (newGroups.length === 0) newGroups.push([]); // Always keep at least one group
    setGroups(newGroups);
    onChange(newGroups.flat());
  };

  return (
    <div className="space-y-4">
      {groups.map((groupFilters, index) => (
        <div key={index}>
          <FilterGroupComponent
            filters={groupFilters}
            fields={fields}
            onUpdate={(filters) => updateGroup(index, filters)}
            onDelete={groups.length > 1 ? () => removeGroup(index) : undefined}
            showDelete={groups.length > 1}
          />
          {index < groups.length - 1 && (
            <div className="flex items-center justify-center my-4">
              <span className="px-4 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-600">OR</span>
            </div>
          )}
        </div>
      ))}
      
      <Button
        type="button"
        onClick={addGroup}
        variant="outline"
        size="sm"
        className="mt-4 h-10 px-4 text-sm"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Filter Group
      </Button>
    </div>
  );
}
