'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Filter, FilterOperator, FilterGroup, createFilter } from '@/types/filters';
import { X } from 'lucide-react';

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
        <Button onClick={addFilter} variant="outline" size="sm">
          Add Filter
        </Button>
        {filters.length > 1 && (
          <Select
            value={logic}
            onValueChange={(value: 'AND' | 'OR') => setLogic(value)}
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        {filters.map((filter, index) => (
          <div key={filter.id} className="flex items-center gap-2 p-2 border rounded-md">
            {/* Field selector */}
            <Select
              value={filter.field}
              onValueChange={(value) => updateFilter(filter.id, { field: value })}
            >
              {fields.map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </Select>

            {/* Operator selector */}
            <Select
              value={filter.operator}
              onValueChange={(value: FilterOperator) => 
                updateFilter(filter.id, { 
                  operator: value,
                  value: value === 'exists' || value === 'not_exists' ? undefined : filter.value 
                })
              }
            >
              {operators.map(op => (
                <option key={op} value={op}>
                  {op.replace('_', ' ')}
                </option>
              ))}
            </Select>

            {/* Value input for equals/not_equals */}
            {(filter.operator === 'equals' || filter.operator === 'not_equals') && (
              <Input
                type="text"
                value={filter.value || ''}
                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                placeholder="Value..."
                className="flex-1"
              />
            )}

            {/* Remove filter button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFilter(filter.id)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
} 