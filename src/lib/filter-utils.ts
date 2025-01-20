import { Filter } from '@/types/filters';

interface WebhookData {
  [key: string]: any;
}

interface NormalizedData {
  [key: string]: string | null;
}

/**
 * Normalizes webhook data into a flat structure with standardized field access
 */
function normalizeWebhookData(data: WebhookData): NormalizedData {
  const normalized: NormalizedData = {};
  
  // Helper to safely get nested value
  const getNestedValue = (obj: any, path: string): string | null => {
    const value = path.split('.').reduce((o, i) => o?.[i], obj);
    return value ? String(value) : null;
  };

  // Extract contact data
  if (data.contactData) {
    // Basic fields
    normalized.email = getNestedValue(data.contactData, 'email') || 
                      getNestedValue(data.contactData, '{email}');
    normalized.company = getNestedValue(data.contactData, 'company') || 
                        getNestedValue(data.contactData, 'company_name') ||
                        getNestedValue(data.contactData, 'PMS');
    normalized.firstName = getNestedValue(data.contactData, 'first_name');
    normalized.lastName = getNestedValue(data.contactData, 'last_name');
    
    // Custom/special fields
    normalized.lifecycle_stage = getNestedValue(data.contactData, 'lifecycle_stage');
    normalized.lead_status = getNestedValue(data.contactData, 'lead_status');
    normalized.userWebhookUrl = getNestedValue(data, 'userWebhookUrl');

    // Add all remaining contactData fields
    Object.entries(data.contactData).forEach(([key, value]) => {
      const normalizedKey = key.replace(/[{}]/g, '').toLowerCase();
      if (value && typeof value !== 'object') {
        normalized[normalizedKey] = String(value);
      }
    });
  }

  // Add top-level fields
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'contactData' && value && typeof value !== 'object') {
      normalized[key.toLowerCase()] = String(value);
    }
  });

  console.log('Normalized webhook data:', normalized);
  return normalized;
}

/**
 * Evaluates a single filter against normalized data
 */
export function evaluateFilter(filter: Filter, normalizedData: NormalizedData): boolean {
  const { field, operator, value } = filter;
  
  // Get field value, removing template syntax if present
  const normalizedField = field.replace(/[{}]/g, '').toLowerCase();
  const fieldValue = normalizedData[normalizedField];
  
  console.log('Evaluating filter:', { 
    field: normalizedField, 
    operator, 
    expectedValue: value, 
    actualValue: fieldValue 
  });

  switch (operator) {
    case 'exists':
      return fieldValue !== null;
    
    case 'not_exists':
      return fieldValue === null;
    
    case 'equals':
      return fieldValue !== null && fieldValue.toLowerCase() === String(value).toLowerCase();
    
    case 'not_equals':
      return fieldValue === null || fieldValue.toLowerCase() !== String(value).toLowerCase();
    
    default:
      console.warn('Unknown operator:', operator);
      return true;
  }
}

/**
 * Evaluates an array of filters against webhook data
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

  // Normalize data once for all filters
  const normalizedData = normalizeWebhookData(data);
  
  console.log('Evaluating filters:', { 
    filterCount: filters.length, 
    logic,
    filters 
  });

  const results = filters.map(filter => ({
    filter,
    passed: evaluateFilter(filter, normalizedData)
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