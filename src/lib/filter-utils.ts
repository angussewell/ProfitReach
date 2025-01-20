import { Filter } from '@/types/filters';

interface WebhookData {
  [key: string]: any;
}

/**
 * Gets a field value from webhook data, handling nested paths and template formats
 */
function getFieldValue(data: WebhookData, field: string): any {
  if (typeof field !== 'string') {
    console.error('Invalid field type:', field);
    return undefined;
  }

  console.log('Getting field value:', { field, dataKeys: Object.keys(data) });

  // Try direct access
  let value = data[field];
  if (value !== undefined) {
    console.log('Found value directly:', { field, value });
    return value;
  }

  // Try in contactData
  if (data.contactData) {
    // Try different formats
    value = 
      data.contactData[field] ||                     // Direct
      data.contactData[`{${field}}`] ||             // Template format
      data.contactData[field.replace(/[{}]/g, '')] || // Without brackets
      data.contactData[field.toLowerCase()];         // Lowercase
    
    if (value !== undefined) {
      console.log('Found value in contactData:', { field, value });
      return value;
    }
  }

  // Try as nested path
  const path = field.split('.');
  let current = data;
  for (const key of path) {
    if (current === undefined || current === null) {
      console.log('Path traversal failed at:', { key, field });
      return undefined;
    }
    // Try with and without template format
    current = current[key] || current[`{${key}}`] || current[key.replace(/[{}]/g, '')];
  }

  console.log('Final nested value:', { field, value: current });
  return current;
}

/**
 * Evaluates a single filter against webhook data
 */
export function evaluateFilter(filter: Filter, data: WebhookData): boolean {
  if (!filter || typeof filter !== 'object') {
    console.error('Invalid filter:', filter);
    return true; // Fail open
  }

  const { field, operator, value } = filter;
  const fieldValue = getFieldValue(data, field);
  
  console.log('Evaluating filter:', { field, operator, value, fieldValue });

  // Handle null/undefined values consistently
  const isEmptyValue = fieldValue === undefined || fieldValue === null || fieldValue === '';
  
  switch (operator) {
    case 'exists':
      return !isEmptyValue;
    
    case 'not_exists':
      return isEmptyValue;
    
    case 'equals':
      if (isEmptyValue) return false;
      return String(fieldValue).toLowerCase() === String(value).toLowerCase();
    
    case 'not_equals':
      if (isEmptyValue) return true;
      return String(fieldValue).toLowerCase() !== String(value).toLowerCase();
    
    default:
      console.warn('Unknown operator:', operator);
      return true; // Fail open for unknown operators
  }
}

/**
 * Evaluates an array of filters against webhook data
 * @param filters Array of filters to evaluate
 * @param data Webhook data to evaluate against
 * @param logic 'AND' or 'OR' logic to apply between filters
 * @returns Object containing result and reason if blocked
 */
export function evaluateFilters(
  filters: Filter[],
  data: WebhookData,
  logic: 'AND' | 'OR' = 'AND'
): { passed: boolean; reason?: string } {
  if (!Array.isArray(filters) || filters.length === 0) {
    console.log('No filters to evaluate');
    return { passed: true };
  }

  console.log('Evaluating filters:', { 
    filterCount: filters.length, 
    logic,
    filters 
  });

  const results = filters.map(filter => ({
    filter,
    passed: evaluateFilter(filter, data)
  }));

  console.log('Filter results:', results);

  const passed = logic === 'AND'
    ? results.every(r => r.passed)
    : results.some(r => r.passed);

  if (!passed) {
    const failedFilters = results
      .filter(r => !r.passed)
      .map(r => {
        const { filter } = r;
        const value = filter.operator === 'exists' || filter.operator === 'not_exists'
          ? ''
          : ` "${filter.value}"`;
        return `${filter.field} ${filter.operator.replace('_', ' ')}${value}`;
      })
      .join(' AND ');

    return {
      passed: false,
      reason: `Failed filters: ${failedFilters}`
    };
  }

  return { passed: true };
} 