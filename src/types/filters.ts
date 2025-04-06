export type FilterOperator = 
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'greaterThan'
  | 'lessThan'
  | 'isAfter'
  | 'isBefore'
  | 'between'
  | 'hasAllTags'
  | 'hasAnyTags'
  | 'hasNoneTags'
  | 'exists' // Added for webhook filters
  | 'not exists'; // Added for webhook filters

// Represents a single filter condition in the UI/state
export type Filter = {
  id: string; // Unique ID for the filter row
  field: string; // Field being filtered
  operator: FilterOperator; // Operator being used
  value?: any; // Value for the operator (optional for some operators)
  group?: string; // Optional group identifier for OR conditions
};

// Represents a filter condition specifically for backend processing (might be slightly different)
export type FilterCondition = {
  id: string; // Unique ID for each condition (for UI management) - Maybe remove if only backend?
  field: string; // Contact field to filter on
  operator: FilterOperator; // Comparison operator
  value: string | number | boolean | null | string[]; // Value to compare with (string[] for date ranges)
};

export type FilterState = {
  conditions: FilterCondition[];
  logicalOperator: 'AND' | 'OR'; // For combining conditions
};

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select' | 'tags';
  options?: { label: string; value: string }[]; // For select fields
  isJsonField?: boolean; // Whether this is a field inside additionalData
  isRelation?: boolean; // Whether this field represents a relation
}

// Available operators based on field type
export const OPERATORS_BY_TYPE: Record<string, { value: FilterOperator; label: string }[]> = {
  string: [
    { value: 'equals', label: 'is exactly' },
    { value: 'notEquals', label: 'is not' },
    { value: 'contains', label: 'contains' },
    { value: 'notContains', label: 'does not contain' },
    { value: 'startsWith', label: 'starts with' },
    { value: 'endsWith', label: 'ends with' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' }
  ],
  number: [
    { value: 'equals', label: 'equals' },
    { value: 'notEquals', label: 'does not equal' },
    { value: 'greaterThan', label: 'is greater than' },
    { value: 'lessThan', label: 'is less than' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' }
  ],
  date: [
    { value: 'equals', label: 'is on' },
    { value: 'isAfter', label: 'is after' },
    { value: 'isBefore', label: 'is before' },
    { value: 'between', label: 'is between' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' }
  ],
  tags: [
    { value: 'hasAllTags', label: 'has all tags' },
    { value: 'hasAnyTags', label: 'has any tags' },
    { value: 'hasNoneTags', label: 'has none of the tags' },
    { value: 'isEmpty', label: 'has no tags' },
    { value: 'isNotEmpty', label: 'has any tag' }
  ],
  boolean: [
    { value: 'equals', label: 'is' }
  ],
  select: [
    { value: 'equals', label: 'is' },
    { value: 'notEquals', label: 'is not' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' }
  ]
};

// This represents all available fields that can be filtered on
export const CONTACT_FIELDS: FieldDefinition[] = [
  { name: 'firstName', label: 'First Name', type: 'string' },
  { name: 'lastName', label: 'Last Name', type: 'string' },
  { name: 'email', label: 'Email', type: 'string' },
  { name: 'title', label: 'Title', type: 'string' },
  { name: 'currentCompanyName', label: 'Company', type: 'string' },
  { name: 'leadStatus', label: 'Lead Status', type: 'select', options: [
    { label: 'New', value: 'New' },
    { label: 'Contacted', value: 'Contacted' },
    { label: 'Qualified', value: 'Qualified' },
    { label: 'Unqualified', value: 'Unqualified' },
    { label: 'Replied', value: 'Replied' },
    { label: 'Customer', value: 'Customer' },
    { label: 'Churned', value: 'Churned' }
  ]},
  { name: 'status', label: 'Status', type: 'string', isJsonField: true },
  { name: 'city', label: 'City', type: 'string' },
  { name: 'state', label: 'State', type: 'string' },
  { name: 'country', label: 'Country', type: 'string' },
  { name: 'createdAt', label: 'Created At', type: 'date' },
  { name: 'updatedAt', label: 'Updated At', type: 'date' },
  { name: 'lastActivityAt', label: 'Last Activity', type: 'date' },
  { name: 'tags', label: 'Tags', type: 'tags', isRelation: true }
];
