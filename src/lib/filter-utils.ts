import { Filter } from '@/types/filters';

interface WebhookData {
  [key: string]: any;
}

/**
 * Gets a field value from webhook data, handling nested paths and template formats
 */
function getFieldValue(data: WebhookData, field: string): any {
  // Try direct access
  let value = data[field];
  if (value !== undefined) return value;

  // Try in contactData
  if (data.contactData) {
    // Try different formats
    value = 
      data.contactData[field] ||                     // Direct
      data.contactData[`{${field}}`] ||             // Template format
      data.contactData[field.replace(/[{}]/g, '')];  // Without brackets
    
    if (value !== undefined) return value;
  }

  // Try as nested path
  const path = field.split('.');
  let current = data;
  for (const key of path) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

/**
 * Evaluates a single filter against webhook data
 */
export function evaluateFilter(filter: Filter, data: WebhookData): boolean {
  const { field, operator, value } = filter;
  const fieldValue = getFieldValue(data, field);

  switch (operator) {
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    
    case 'not_exists':
      return fieldValue === undefined || fieldValue === null || fieldValue === '';
    
    case 'equals':
      return String(fieldValue).toLowerCase() === String(value).toLowerCase();
    
    case 'not_equals':
      return String(fieldValue).toLowerCase() !== String(value).toLowerCase();
    
    default:
      return true;
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
  if (!filters.length) {
    return { passed: true };
  }

  const results = filters.map(filter => ({
    filter,
    passed: evaluateFilter(filter, data)
  }));

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