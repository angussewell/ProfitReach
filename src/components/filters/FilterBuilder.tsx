'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, FilterOperator, FilterGroup, createFilter } from '@/types/filters';
import { X, ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface FilterBuilderProps {
  initialFilters?: Filter[];
  fields: string[];  // Available fields from webhook mappings
  onChange: (filters: Filter[]) => void;
}

export function FilterBuilder({ initialFilters = [], fields, onChange }: FilterBuilderProps) {
  const [filters, setFilters] = useState<Filter[]>(initialFilters);
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');

  const operators: FilterOperator[] = ['exists', 'not_exists', 'equals', 'not_equals'];

  const addFilter = () => {
    const newFilter = createFilter(fields[0], 'exists');
    setFilters([...filters, newFilter]);
    onChange([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    const updatedFilters = filters.filter(f => f.id !== id);
    setFilters(updatedFilters);
    onChange(updatedFilters);
  };

  const updateFilter = (id: string, updates: Partial<Filter>) => {
    const updatedFilters = filters.map(filter => 
      filter.id === id ? { ...filter, ...updates } : filter
    );
    setFilters(updatedFilters);
    onChange(updatedFilters);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button onClick={addFilter} variant="outline" size="sm" className="h-12 px-6 text-base">
          Add Filter
        </Button>
        {filters.length > 1 && (
          <select
            value={logic}
            onChange={(e) => setLogic(e.target.value as 'AND' | 'OR')}
            className="flex w-full items-center justify-between bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg"
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        )}
      </div>

      <div className="space-y-2">
        {filters.map((filter, index) => (
          <div key={filter.id} className="flex items-center gap-2 p-2 border rounded-md">
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
                  value: value === 'exists' || value === 'not_exists' ? undefined : filter.value 
                });
              }}
              className="flex w-full items-center justify-between bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg"
            >
              {operators.map(op => (
                <option key={op} value={op}>
                  {op.replace('_', ' ')}
                </option>
              ))}
            </select>

            {/* Value input for equals/not_equals */}
            {(filter.operator === 'equals' || filter.operator === 'not_equals') && (
              <Input
                type="text"
                value={filter.value || ''}
                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                placeholder="Value..."
                className="flex-1 h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg"
              />
            )}

            {/* Remove filter button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFilter(filter.id)}
              className="h-12 w-12 border-2 border-gray-200 hover:border-[#ff7a59] transition-all rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
} 