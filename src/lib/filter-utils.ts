import { Filter, FilterOperator } from '@/types/filters';

interface WebhookData {
  [key: string]: any;
}

interface NormalizedData {
  [key: string]: string | null;
}

// Production-ready logging
function log(level: 'error' | 'info' | 'warn', message: string, data?: any) {
  console[level](JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.VERCEL_ENV || 'development',
    ...data
  }));
}

/**
 * Normalizes webhook data into a flat structure with standardized field access
 */
function normalizeWebhookData(data: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  // Helper to add a field with various formats
  const addField = (key: string, value: any) => {
    // Convert to lowercase for consistent lookup
    const normalizedKey = key.toLowerCase();
    // Remove any template braces
    const cleanKey = normalizedKey.replace(/[{}]/g, '');
    normalized[cleanKey] = value;
    
    // Log field addition for debugging
    console.log(`Adding field: ${cleanKey} = ${value}`);
  };

  // Process top-level fields
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'contactData') {
      addField(key, value);
    }
  });

  // Process contact data fields
  if (data.contactData && typeof data.contactData === 'object') {
    Object.entries(data.contactData).forEach(([key, value]) => {
      addField(key, value);
    });
  }

  // Log normalized data for debugging
  console.log('Normalized webhook data:', normalized);

  return normalized;
}

/**
 * Finds a field value in the data object, trying multiple formats
 */
function findFieldValue(data: Record<string, any>, field: string): { exists: boolean; value: any } {
  // Remove template syntax and normalize
  const cleanField = field.replace(/[{}]/g, '');
  
  // Ordered list of places to look, maintaining original case
  const locations = [
    // Direct access with original case
    data[field],
    data[cleanField],
    data.contactData?.[field],
    data.contactData?.[cleanField],
    
    // Lowercase variations
    data[field.toLowerCase()],
    data[cleanField.toLowerCase()],
    data.contactData?.[field.toLowerCase()],
    data.contactData?.[cleanField.toLowerCase()],
    
    // Uppercase variations
    data[field.toUpperCase()],
    data[cleanField.toUpperCase()],
    data.contactData?.[field.toUpperCase()],
    data.contactData?.[cleanField.toUpperCase()]
  ];

  // Find first non-undefined value
  const value = locations.find(v => v !== undefined);
  
  log('info', 'Field lookup result', {
    field,
    cleanField,
    exists: value !== undefined,
    value: value,
    checkedLocations: locations.map(v => v !== undefined ? typeof v : 'undefined')
  });

  return {
    exists: value !== undefined,
    value: value
  };
}

function normalizeForComparison(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Evaluates a single filter against normalized data
 */
function evaluateFilter(
  filter: Filter,
  normalizedData: Record<string, any>
): { passed: boolean; reason: string } {
  // Log the start of filter evaluation
  log('info', 'Evaluating filter:', {
    field: filter.field,
    operator: filter.operator,
    value: filter.value,
    normalizedData
  });

  // Check all possible variations of the field name
  const fieldVariations = [
    filter.field,
    filter.field.toLowerCase(),
    `{${filter.field}}`,
    `{${filter.field.toLowerCase()}}`,
    filter.field.toUpperCase(),
    `{${filter.field.toUpperCase()}}`
  ];

  // Check if the field exists in any variation
  const fieldExists = fieldVariations.some(variation => 
    normalizedData[variation] !== undefined && normalizedData[variation] !== null
  );

  // Get the actual value (use the first non-null value found)
  const fieldValue = fieldVariations
    .map(variation => normalizedData[variation])
    .find(value => value !== undefined && value !== null);
  
  // Log the field value found
  log('info', 'Field value found:', {
    field: filter.field,
    variations: fieldVariations,
    exists: fieldExists,
    value: fieldValue,
    normalizedValue: normalizeForComparison(fieldValue)
  });

  switch (filter.operator) {
    case 'exists':
      return {
        passed: fieldExists,
        reason: fieldExists ? 
          `Field ${filter.field} exists with value ${fieldValue}` : 
          `Field ${filter.field} does not exist`
      };

    case 'not exists':
      return {
        passed: !fieldExists,
        reason: !fieldExists ? 
          `Field ${filter.field} does not exist` : 
          `Field ${filter.field} exists with value ${fieldValue}`
      };

    case 'equals':
      const normalizedField = normalizeForComparison(fieldValue);
      const normalizedValue = normalizeForComparison(filter.value);
      const equals = normalizedField === normalizedValue;
      
      log('info', 'Equals comparison:', {
        original: { field: fieldValue, value: filter.value },
        normalized: { field: normalizedField, value: normalizedValue },
        equals
      });
      
      return {
        passed: equals,
        reason: equals ? 
          `Field ${filter.field} equals ${filter.value}` : 
          `Field ${filter.field} (${fieldValue}) does not equal ${filter.value}`
      };

    case 'not equals':
      const neNormalizedField = normalizeForComparison(fieldValue);
      const neNormalizedValue = normalizeForComparison(filter.value);
      const notEquals = neNormalizedField !== neNormalizedValue;
      
      log('info', 'Not equals comparison:', {
        original: { field: fieldValue, value: filter.value },
        normalized: { field: neNormalizedField, value: neNormalizedValue },
        notEquals
      });
      
      return {
        passed: notEquals,
        reason: notEquals ? 
          `Field ${filter.field} (${fieldValue}) is not equal to ${filter.value}` : 
          `Field ${filter.field} equals ${filter.value}`
      };

    case 'contains':
      const containsNormalizedField = normalizeForComparison(fieldValue);
      const containsNormalizedValue = normalizeForComparison(filter.value);
      const contains = containsNormalizedField.includes(containsNormalizedValue);
      
      log('info', 'Contains comparison:', {
        original: { field: fieldValue, value: filter.value },
        normalized: { field: containsNormalizedField, value: containsNormalizedValue },
        contains
      });
      
      return {
        passed: contains,
        reason: contains ? 
          `Field ${filter.field} contains ${filter.value}` : 
          `Field ${filter.field} (${fieldValue}) does not contain ${filter.value}`
      };

    case 'not contains':
      const ncNormalizedField = normalizeForComparison(fieldValue);
      const ncNormalizedValue = normalizeForComparison(filter.value);
      const notContains = !ncNormalizedField.includes(ncNormalizedValue);
      
      log('info', 'Not contains comparison:', {
        original: { field: fieldValue, value: filter.value },
        normalized: { field: ncNormalizedField, value: ncNormalizedValue },
        notContains
      });
      
      return {
        passed: notContains,
        reason: notContains ? 
          `Field ${filter.field} does not contain ${filter.value}` : 
          `Field ${filter.field} (${fieldValue}) contains ${filter.value}`
      };

    default:
      return {
        passed: false,
        reason: `Unknown operator: ${filter.operator}`
      };
  }
}

/**
 * Evaluates a group of filters (AND logic within group)
 */
function evaluateFilterGroup(filters: Filter[], data: Record<string, any>): { passed: boolean; reasons: string[] } {
  const results = filters.map(filter => evaluateFilter(filter, data));
  
  log('info', 'Filter group evaluation', {
    filterCount: filters.length,
    results: results.map(r => ({ passed: r.passed, reason: r.reason }))
  });

  return {
    passed: results.every(r => r.passed),
    reasons: results.map(r => r.reason)
  };
}

// Single source of truth for filter handling
const FilterPipeline = {
  normalize: (filter: Filter): Filter => ({
    ...filter,
    field: filter.field.trim(),
    value: filter.value?.trim(),
    operator: filter.operator
  }),
  
  validate: (filter: Filter): Filter => {
    const errors = [];
    if (!filter.field) errors.push('Field required');
    if (filter.operator === 'equals' && !filter.value) errors.push('Value required for equals operator');
    if (errors.length > 0) {
      log('error', 'Filter validation failed', { filter, errors });
      throw new Error(errors.join(', '));
    }
    return filter;
  },
  
  process: (filter: Filter, data: Record<string, any>): { passed: boolean; reason: string } => {
    try {
      const normalized = FilterPipeline.normalize(filter);
      FilterPipeline.validate(normalized);
      log('info', 'Processing filter', { original: filter, normalized });
      return evaluateFilter(normalized, normalizeWebhookData(data));
    } catch (error) {
      log('error', 'Filter processing failed', { filter, error: String(error) });
      return { passed: false, reason: String(error) };
    }
  }
};

/**
 * Evaluates all filter groups (OR logic between groups)
 */
export function evaluateFilters(
  filterGroups: Array<{
    logic: string;
    filters: Filter[];
  }>,
  data: Record<string, any>
): { passed: boolean; reason: string } {
  log('info', 'Starting filter evaluation', { 
    groupCount: filterGroups?.length || 0,
    data 
  });

  if (!filterGroups?.length) {
    return { passed: true, reason: 'No filters configured' };
  }

  const results = filterGroups.map(group => {
    const filterResults = group.filters.map(filter => 
      FilterPipeline.process(filter, data)
    );

    const passed = filterResults.every(r => r.passed);
    return {
      passed,
      reason: filterResults.map(r => r.reason).join(' AND ')
    };
  });

  const passed = results.some(r => r.passed);
  const reason = passed
    ? `Passed: ${results.find(r => r.passed)?.reason}`
    : `Failed: ${results.map(r => `(${r.reason})`).join(' OR ')}`;

  log('info', 'Filter evaluation complete', { passed, reason });
  return { passed, reason };
} 