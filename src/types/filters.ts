import { 
  CONTACT_FIELDS as BASE_CONTACT_FIELDS, 
  FieldOption, 
  FIELD_GROUPS,
  LEAD_STATUS_OPTIONS 
} from '@/lib/field-definitions';

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
  // Tag Operators
  | 'hasAllTags'
  | 'hasAnyTags'
  | 'hasNoneOfTheTags' // Corrected from hasNoneTags and matches backend
  | 'hasNoTags' // Added to match backend
  // Webhook Operators (Keep if used elsewhere)
  | 'exists' 
  | 'not exists'; 

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
    { value: 'notEquals', label: 'is not' }, // Maps to 'isNot' in UI?
    { value: 'contains', label: 'contains' },
    { value: 'notContains', label: 'does not contain' }, // Maps to 'doesNotContain' in UI?
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
    { value: 'hasAnyTags', label: 'has any tags' },
    { value: 'hasAllTags', label: 'has all tags' },
    { value: 'hasNoneOfTheTags', label: 'has none of the tags' }, // Corrected operator value
    { value: 'hasNoTags', label: 'has no tags' }, // Added operator value
    // Note: 'isEmpty'/'isNotEmpty' for tags might be confusing. 
    // 'hasNoTags' and 'hasAnyTags' seem clearer. Consider removing isEmpty/isNotEmpty for tags if not used.
    // { value: 'isEmpty', label: 'is empty' }, // Example if needed
    // { value: 'isNotEmpty', label: 'is not empty' } // Example if needed
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

// Helper function to determine field type from the new centralized definitions
function getFieldType(fieldValue: string): 'string' | 'number' | 'date' | 'boolean' | 'select' | 'tags' {
  // Special cases based on field name
  if (fieldValue === 'tags') return 'tags';
  if (fieldValue === 'leadStatus') return 'select';
  if (['createdAt', 'updatedAt', 'lastActivityAt', 'dateOfResearch'].includes(fieldValue)) return 'date';
  if (fieldValue === 'propertyCount') return 'number';
  
  // Default to string for most fields
  return 'string';
}

// Function to check if a field is part of additionalData
function isJsonField(fieldValue: string): boolean {
  return fieldValue.startsWith('additionalData.');
}

// Function to check if a field is a relation
function isRelationField(fieldValue: string): boolean {
  return fieldValue === 'tags';
}

// This represents all available fields that can be filtered on
// Transform the base contact fields to the expected FieldDefinition format
export const CONTACT_FIELDS: FieldDefinition[] = BASE_CONTACT_FIELDS
  .filter(field => {
    // Filter out fields that don't make sense to filter on
    const excludedFields = ['employmentHistory', 'contactEmails', 'phoneNumbers'];
    return !excludedFields.includes(field.value);
  })
  .map(field => ({
    name: field.value,
    label: field.label,
    type: getFieldType(field.value),
    isJsonField: isJsonField(field.value),
    isRelation: isRelationField(field.value),
    ...(field.value === 'leadStatus' ? {
      options: LEAD_STATUS_OPTIONS
    } : {})
  }));
