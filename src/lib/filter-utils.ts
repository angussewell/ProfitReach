import { Filter } from '@/types/filters';

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
function normalizeWebhookData(data: WebhookData): NormalizedData {
  const normalized: NormalizedData = {};
  
  // Helper to safely get nested value
  const getNestedValue = (obj: any, path: string): string | null => {
    try {
      // Try direct access first
      let value = obj[path];
      if (value !== undefined) return String(value);
      
      // Try with braces
      value = obj[`{${path}}`];
      if (value !== undefined) return String(value);
      
      // Try without braces if path has them
      if (path.startsWith('{') && path.endsWith('}')) {
        value = obj[path.slice(1, -1)];
        if (value !== undefined) return String(value);
      }
      
      // Try nested path
      const nestedValue = path.split('.').reduce((o, i) => o?.[i], obj);
      if (nestedValue !== undefined) return String(nestedValue);
      
      // Try lowercase variations
      const lowerPath = path.toLowerCase();
      value = obj[lowerPath] || 
              obj[`{${lowerPath}}`] || 
              obj[lowerPath.replace(/[{}]/g, '')] ||
              lowerPath.split('.').reduce((o, i) => o?.[i.toLowerCase()], obj);
              
      return value !== undefined ? String(value) : null;
    } catch (error) {
      log('error', 'Error getting nested value', { path, error: String(error) });
      return null;
    }
  };

  // Extract contact data with better error handling
  if (data.contactData) {
    try {
      // Basic fields with fallbacks
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
      normalized.make_sequence = getNestedValue(data.contactData, 'make_sequence');
      
      // Add all remaining contactData fields
      Object.entries(data.contactData).forEach(([key, value]) => {
        if (value && typeof value !== 'object') {
          const normalizedKey = key.replace(/[{}]/g, '').toLowerCase();
          normalized[normalizedKey] = String(value);
          normalized[`contactData.${normalizedKey}`] = String(value);
        }
      });
    } catch (error) {
      log('error', 'Error normalizing contact data', { error: String(error) });
    }
  }

  // Add top-level fields
  try {
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'contactData' && value && typeof value !== 'object') {
        const normalizedKey = key.toLowerCase();
        normalized[normalizedKey] = String(value);
      }
    });
  } catch (error) {
    log('error', 'Error normalizing top-level fields', { error: String(error) });
  }

  log('info', 'Normalized webhook data', { 
    fieldCount: Object.keys(normalized).length,
    fields: Object.keys(normalized)
  });
  
  return normalized;
}

/**
 * Evaluates a single filter against normalized data
 */
function evaluateFilter(filter: Filter, normalizedData: NormalizedData): boolean {
  const { field, operator, value } = filter;
  
  // Get the field value, trying multiple formats
  const fieldValue = 
    // Try direct access first
    normalizedData[field] ||  // Exact match
    (normalizedData as any).contactData?.[field] || // Direct contactData access with type assertion
    // Then try normalized versions
    normalizedData[field.toLowerCase()] || 
    normalizedData[field.replace(/[{}]/g, '').toLowerCase()] ||
    normalizedData[`contactData.${field.toLowerCase()}`] ||
    normalizedData[`contactData.${field.replace(/[{}]/g, '').toLowerCase()}`] ||
    normalizedData[field.replace(/[{}]/g, '')] || // Without braces
    // Finally try nested path
    field.split('.').reduce((obj: any, key: string) => (obj && typeof obj === 'object' ? obj[key] : undefined), normalizedData as any);
  
  log('info', 'Evaluating filter', { 
    field, 
    operator, 
    value, 
    fieldValue,
    allFields: Object.keys(normalizedData),
    normalizedData  // Log full normalized data for debugging
  });

  try {
    switch (operator) {
      case 'exists':
        const exists = fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
        log('info', `Filter exists check: ${exists}`, { field, fieldValue });
        return exists;
        
      case 'not_exists':
        const notExists = !fieldValue || fieldValue === '';
        log('info', `Filter not_exists check: ${notExists}`, { field, fieldValue });
        return notExists;
        
      case 'equals':
        // Handle case where fieldValue or value might be undefined
        if (!fieldValue || !value) {
          log('info', 'Filter equals check: false (missing value)', { field, fieldValue, value });
          return false;
        }
        const equals = String(fieldValue).toLowerCase() === String(value).toLowerCase();
        log('info', `Filter equals check: ${equals}`, { field, fieldValue, value });
        return equals;
        
      case 'not_equals':
        // Handle case where fieldValue or value might be undefined
        if (!fieldValue || !value) {
          log('info', 'Filter not_equals check: true (missing value)', { field, fieldValue, value });
          return true;
        }
        const notEquals = String(fieldValue).toLowerCase() !== String(value).toLowerCase();
        log('info', `Filter not_equals check: ${notEquals}`, { field, fieldValue, value });
        return notEquals;
        
      default:
        log('warn', 'Unknown operator', { operator });
        return false;
    }
  } catch (error) {
    log('error', 'Error evaluating filter', { 
      field, 
      operator, 
      value, 
      fieldValue,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

/**
 * Evaluates a list of filters against webhook data
 */
export function evaluateFilters(filters: Filter[], data: WebhookData) {
  if (!filters || filters.length === 0) {
    log('info', 'No filters to evaluate');
    return { passed: true };
  }

  try {
    const normalizedData = normalizeWebhookData(data);
    
    // Evaluate each filter
    for (const filter of filters) {
      const passed = evaluateFilter(filter, normalizedData);
      log('info', 'Filter result', { filter, passed });
      
      if (!passed) {
        return {
          passed: false,
          reason: `Failed filter: ${filter.field} ${filter.operator} ${filter.value || ''}`
        };
      }
    }

    return { passed: true };
  } catch (error) {
    log('error', 'Error evaluating filters', { error: String(error) });
    return { 
      passed: false, 
      reason: `Error evaluating filters: ${String(error)}`
    };
  }
} 