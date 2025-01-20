'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, FilterOperator, FilterGroup, createFilter } from '@/types/filters';
import { X, Plus, ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface FilterGroupProps {
  filters: Filter[];
  fields: string[];
  onUpdate: (filters: Filter[]) => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

function FilterGroupComponent({ filters, fields, onUpdate, onDelete, showDelete }: FilterGroupProps) {
  const operators: FilterOperator[] = ['exists', 'not exists', 'equals', 'not equals', 'contains', 'not contains'];

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
            {/* Field selector */}
            <select
              value={filter.field}
              onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
              className="flex w-full items-center justify-between bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg"
            >
              {fields.map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>

            {/* Operator selector */}
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

            {/* Value input for operators that need it */}
            {(filter.operator === 'equals' || filter.operator === 'not equals' || 
              filter.operator === 'contains' || filter.operator === 'not contains') && (
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
    // Convert flat filter list to groups
    if (initialFilters.length === 0) return [[]];
    return [initialFilters]; // Start with all filters in one group
  });

  const updateGroup = (index: number, filters: Filter[]) => {
    const newGroups = [...groups];
    newGroups[index] = filters;
    setGroups(newGroups);
    // Flatten groups and notify parent
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