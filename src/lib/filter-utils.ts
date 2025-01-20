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

/**
 * Evaluates a single filter against the data
 */
function evaluateFilter(filter: Filter, data: Record<string, any>): { passed: boolean; reason: string } {
  const { field, operator, value: expectedValue } = filter;
  const { exists, value: actualValue } = findFieldValue(data, field);

  log('info', 'Evaluating filter', {
    field,
    operator,
    expectedValue,
    exists,
    actualValue
  });

  switch (operator) {
    case 'exists':
      return {
        passed: exists,
        reason: exists ? 
          `Field '${field}' exists with value '${actualValue}'` :
          `Field '${field}' does not exist`
      };

    case 'not_exists':
      return {
        passed: !exists,
        reason: !exists ?
          `Field '${field}' does not exist` :
          `Field '${field}' exists with value '${actualValue}'`
      };

    case 'equals':
      return {
        passed: exists && String(actualValue).toLowerCase() === String(expectedValue).toLowerCase(),
        reason: exists ?
          `Field '${field}' value '${actualValue}' ${String(actualValue).toLowerCase() === String(expectedValue).toLowerCase() ? 'matches' : 'does not match'} expected '${expectedValue}'` :
          `Field '${field}' does not exist to compare with '${expectedValue}'`
      };

    case 'not_equals':
      return {
        passed: exists && String(actualValue).toLowerCase() !== String(expectedValue).toLowerCase(),
        reason: exists ?
          `Field '${field}' value '${actualValue}' ${String(actualValue).toLowerCase() !== String(expectedValue).toLowerCase() ? 'does not match' : 'matches'} excluded value '${expectedValue}'` :
          `Field '${field}' does not exist to compare with '${expectedValue}'`
      };

    default:
      log('error', 'Unknown operator', { operator });
      return { passed: false, reason: `Unknown operator: ${operator}` };
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

/**
 * Evaluates all filter groups (OR logic between groups)
 */
export function evaluateFilters(
  filters: Filter[],
  data: Record<string, any>
): { passed: boolean; reason: string } {
  try {
    // Group filters by their group ID
    const groups = filters.reduce((acc, filter) => {
      const groupId = filter.group || 'default';
      acc[groupId] = acc[groupId] || [];
      acc[groupId].push(filter);
      return acc;
    }, {} as Record<string, Filter[]>);

    log('info', 'Starting filter evaluation', {
      totalFilters: filters.length,
      groupCount: Object.keys(groups).length,
      groups: Object.entries(groups).map(([id, filters]) => ({
        groupId: id,
        filterCount: filters.length,
        filters: filters.map(f => ({ field: f.field, operator: f.operator, value: f.value }))
      }))
    });

    // If no filters, pass by default
    if (filters.length === 0) {
      return { passed: true, reason: 'No filters to evaluate' };
    }

    // Evaluate each group
    const groupResults = Object.entries(groups).map(([groupId, groupFilters]) => {
      const result = evaluateFilterGroup(groupFilters, data);
      return { groupId, ...result };
    });

    // Log detailed results
    log('info', 'Filter evaluation complete', {
      groupResults: groupResults.map(r => ({
        groupId: r.groupId,
        passed: r.passed,
        reasons: r.reasons
      }))
    });

    // Pass if any group passes (OR logic between groups)
    const passed = groupResults.some(r => r.passed);
    const reason = passed ?
      `Passed filter group(s): ${groupResults.filter(r => r.passed).map(r => r.groupId).join(', ')}` :
      `Failed all filter groups: ${groupResults.map(r => `[Group ${r.groupId}: ${r.reasons.join(' AND ')}]`).join(' OR ')}`;

    return { passed, reason };
  } catch (error) {
    log('error', 'Filter evaluation error', { error: String(error) });
    return { passed: false, reason: `Error evaluating filters: ${error}` };
  }
} 