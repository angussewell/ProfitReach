export type FilterOperator = 'exists' | 'not_exists' | 'equals' | 'not_equals';

export interface Filter {
  id: string;        // Unique identifier for the filter
  field: string;     // The field to filter on (e.g. 'lifecycle_stage')
  operator: FilterOperator;
  value?: string;    // Optional value for equals/not_equals operators
  group?: string;    // Optional group ID for OR logic between groups
}

export interface FilterGroup {
  filters: Filter[];
  logic: 'AND' | 'OR';
}

// Helper function to create a new filter
export const createFilter = (field: string, operator: FilterOperator, value?: string): Filter => ({
  id: Math.random().toString(36).substr(2, 9),
  field,
  operator,
  value
}); 