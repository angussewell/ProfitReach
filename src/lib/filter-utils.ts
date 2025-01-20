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

function normalizeValue(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().trim().replace(/\s+/g, ' ');
}

function compareValues(actual: string | null | undefined, expected: string | null | undefined, operator: FilterOperator): { passed: boolean; reason: string } {
  const normalizedActual = normalizeValue(actual);
  const normalizedExpected = normalizeValue(expected);
  
  log('info', 'Comparing values', {
    original: { actual, expected },
    normalized: { actual: normalizedActual, expected: normalizedExpected },
    operator
  });

  switch (operator) {
    case 'exists':
      return {
        passed: normalizedActual !== '',
        reason: normalizedActual !== '' ? 
          `Field exists with value ${actual}` : 
          `Field does not exist`
      };

    case 'not exists':
      return {
        passed: normalizedActual === '',
        reason: normalizedActual === '' ? 
          `Field does not exist` : 
          `Field exists with value ${actual}`
      };

    case 'equals':
      const equals = normalizedActual === normalizedExpected;
      return {
        passed: equals,
        reason: equals ? 
          `Value equals ${expected}` : 
          `Value (${actual}) does not equal ${expected}`
      };

    case 'not equals':
      const notEquals = normalizedActual !== normalizedExpected;
      return {
        passed: notEquals,
        reason: notEquals ? 
          `Value (${actual}) is not equal to ${expected}` : 
          `Value equals ${expected}`
      };

    case 'contains':
      const contains = normalizedActual.includes(normalizedExpected);
      return {
        passed: contains,
        reason: contains ? 
          `Value contains ${expected}` : 
          `Value (${actual}) does not contain ${expected}`
      };

    case 'not contains':
      const notContains = !normalizedActual.includes(normalizedExpected);
      return {
        passed: notContains,
        reason: notContains ? 
          `Value does not contain ${expected}` : 
          `Value (${actual}) contains ${expected}`
      };

    default:
      return {
        passed: false,
        reason: `Unknown operator: ${operator}`
      };
  }
}

function evaluateFilter(filter: Filter, data: Record<string, any>): { passed: boolean; reason: string } {
  const normalizedData = normalizeWebhookData(data);
  const fieldValue = findFieldValue(normalizedData, filter.field).value;
  
  log('info', 'Evaluating filter', {
    field: filter.field,
    operator: filter.operator,
    expectedValue: filter.value,
    actualValue: fieldValue
  });

  return compareValues(fieldValue, filter.value, filter.operator);
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