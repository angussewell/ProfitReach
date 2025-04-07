'use client';

import { Button } from '@/components/ui/button';
import { 
  FilterCondition, 
  FieldDefinition, 
  CONTACT_FIELDS, 
  OPERATORS_BY_TYPE,
  FilterOperator
} from '@/types/filters';
import { useEffect, useState } from 'react';
import TagSelector from './TagSelector';

interface FilterConditionRowProps {
  condition: FilterCondition;
  onChange: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
}

export default function FilterConditionRow({
  condition,
  onChange,
  onRemove
}: FilterConditionRowProps) {
  // Find the field definition based on the selected field
  const [selectedField, setSelectedField] = useState<FieldDefinition | undefined>(
    CONTACT_FIELDS.find(field => field.name === condition.field)
  );

  // When the condition.field changes, update the selected field definition
  useEffect(() => {
    const field = CONTACT_FIELDS.find(field => field.name === condition.field);
    setSelectedField(field);
  }, [condition.field]);

  // Get operators based on field type
  const availableOperators = selectedField 
    ? OPERATORS_BY_TYPE[selectedField.type] || []
    : [];

  // Handle field change
  const handleFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fieldName = e.target.value;
    const field = CONTACT_FIELDS.find(f => f.name === fieldName);
    
    if (field) {
      // Set default operator for the new field type
      const defaultOperator = OPERATORS_BY_TYPE[field.type][0].value;
      
      onChange({
        field: fieldName,
        operator: defaultOperator,
        value: '' // Reset value when field changes
      });
    }
  };

  // Handle operator change
  const handleOperatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const operator = e.target.value as FilterOperator;
    
    // For isEmpty/isNotEmpty operators, we don't need a value
    const needsValue = !['isEmpty', 'isNotEmpty'].includes(operator);
    
    onChange({
      operator,
      // Only clear value for operators that don't need it
      ...(needsValue ? {} : { value: null })
    });
  };

  // Handle value change based on field type
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value: string | boolean | number | null = e.target.value;
    
    // Convert value to appropriate type based on field type
    if (selectedField) {
      if (selectedField.type === 'number') {
        value = value ? Number(value) : null;
      } else if (selectedField.type === 'boolean') {
        value = value === 'true';
      }
    }
    
    onChange({ value });
  };

  // Check if we need to show the value input (not for isEmpty/isNotEmpty operators)
  const showValueInput = !['isEmpty', 'isNotEmpty'].includes(condition.operator);

  return (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-gray-50 p-2 rounded-md">
      {/* Field selector */}
      <div className="w-full md:w-1/3">
        <select
          value={condition.field}
          onChange={handleFieldChange}
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm leading-5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {CONTACT_FIELDS.map(field => (
            <option key={field.name} value={field.name}>
              {field.label}
            </option>
          ))}
        </select>
      </div>

      {/* Operator selector */}
      <div className="w-full md:w-1/3">
        <select
          value={condition.operator}
          onChange={handleOperatorChange}
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm leading-5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {availableOperators.map(op => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* Value input - changes based on field type */}
      {showValueInput && (
        <div className="w-full md:w-1/3">
          {selectedField?.type === 'select' && selectedField.options ? (
            <select
              value={condition.value as string || ''}
              onChange={handleValueChange}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm leading-5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              {selectedField.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : selectedField?.type === 'date' ? (
            condition.operator === 'between' ? (
              <div className="flex gap-1 items-center">
                <input
                  type="date"
                  value={Array.isArray(condition.value) ? condition.value[0] || '' : ''}
                  onChange={(e) => {
                    const startDate = e.target.value;
                    const endDate = Array.isArray(condition.value) && condition.value.length > 1 
                      ? condition.value[1] 
                      : '';
                    onChange({ value: [startDate, endDate] });
                  }}
                  className="w-1/2 rounded-md border border-gray-300 bg-white py-2 px-3 text-sm leading-5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={Array.isArray(condition.value) && condition.value.length > 1 ? condition.value[1] || '' : ''}
                  onChange={(e) => {
                    const endDate = e.target.value;
                    const startDate = Array.isArray(condition.value) && condition.value.length > 0 
                      ? condition.value[0] 
                      : '';
                    onChange({ value: [startDate, endDate] });
                  }}
                  className="w-1/2 rounded-md border border-gray-300 bg-white py-2 px-3 text-sm leading-5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ) : (
              <input
                type="date"
                value={condition.value as string || ''}
                onChange={handleValueChange}
                className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm leading-5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )
          ) : selectedField?.type === 'boolean' ? (
            <select
              value={(condition.value as boolean)?.toString() || ''}
              onChange={handleValueChange}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm leading-5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : selectedField?.type === 'tags' ? (
            <TagSelector
              selectedTags={Array.isArray(condition.value) ? condition.value as string[] : 
                typeof condition.value === 'string' ? [condition.value as string] : []}
              onChange={(tags) => onChange({ value: tags })}
              placeholder="Select tags..."
            />
          ) : (
            <input
              type={selectedField?.type === 'number' ? 'number' : 'text'}
              value={condition.value as string || ''}
              onChange={handleValueChange}
              placeholder="Enter value..."
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm leading-5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}
        </div>
      )}

      {/* Remove button */}
      <div className="flex items-center justify-center">
        <button
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none text-xl font-bold"
          aria-label="Remove filter"
          title="Remove filter"
        >
          ×
        </button>
      </div>
    </div>
  );
}
