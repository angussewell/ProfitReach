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

/**
 * Evaluates a single filter against the data
 */
function evaluateFilter(
  filter: Filter,
  normalizedData: Record<string, any>
): { passed: boolean; reason: string } {
  const { field, operator, value } = filter;
  const normalizedField = field.toLowerCase().replace(/[{}]/g, '');
  const fieldValue = normalizedData[normalizedField];
  
  console.log('Evaluating filter:', {
    field: normalizedField,
    operator,
    expectedValue: value,
    actualValue: fieldValue,
    exists: fieldValue !== undefined
  });

  switch (operator) {
    case 'exists': {
      const exists = fieldValue !== undefined;
      console.log(`Checking if ${field} exists:`, exists);
      return {
        passed: exists,
        reason: exists ? 
          `Field ${field} exists with value: ${fieldValue}` :
          `Field ${field} does not exist`
      };
    }

    case 'not_exists': {
      const exists = fieldValue !== undefined;
      console.log(`Checking if ${field} does not exist:`, !exists);
      return {
        passed: !exists,
        reason: !exists ?
          `Field ${field} does not exist` :
          `Field ${field} exists with value: ${fieldValue}`
      };
    }

    case 'equals': {
      if (fieldValue === undefined) {
        console.log(`Field ${field} does not exist for equals comparison`);
        return {
          passed: false,
          reason: `Field ${field} does not exist for equals comparison`
        };
      }
      const matches = String(fieldValue).toLowerCase() === String(value).toLowerCase();
      console.log(`Checking if ${field} equals ${value}:`, matches);
      return {
        passed: matches,
        reason: matches ?
          `Field ${field} matches value: ${value}` :
          `Field ${field} value: ${fieldValue} does not match expected: ${value}`
      };
    }

    case 'not_equals': {
      if (fieldValue === undefined) {
        console.log(`Field ${field} does not exist, so it cannot equal ${value}`);
        return {
          passed: true,
          reason: `Field ${field} does not exist, so it cannot equal ${value}`
        };
      }
      const matches = String(fieldValue).toLowerCase() === String(value).toLowerCase();
      console.log(`Checking if ${field} does not equal ${value}:`, !matches);
      return {
        passed: !matches,
        reason: !matches ?
          `Field ${field} value: ${fieldValue} does not match ${value}` :
          `Field ${field} matches excluded value: ${value}`
      };
    }

    default:
      console.warn(`Unknown operator: ${operator}`);
      return {
        passed: false,
        reason: `Unknown operator: ${operator}`
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
  // First normalize the data
  const normalizedData = normalizeWebhookData(data);
  
  console.log('Starting filter evaluation:', {
    groupCount: filterGroups.length,
    normalizedData
  });

  // If no filters, pass by default
  if (!filterGroups || filterGroups.length === 0) {
    return { passed: true, reason: 'No filters configured' };
  }

  // Track results of each group for detailed feedback
  const groupResults = filterGroups.map(group => {
    console.log('Evaluating filter group:', {
      logic: group.logic,
      filterCount: group.filters.length
    });

    // All filters in a group must pass (AND logic)
    const filterResults = group.filters.map(filter => 
      evaluateFilter(filter, normalizedData)
    );

    const groupPassed = filterResults.every(result => result.passed);
    
    console.log('Filter group result:', {
      passed: groupPassed,
      results: filterResults
    });

    return {
      passed: groupPassed,
      reason: filterResults.map(r => r.reason).join(' AND ')
    };
  });

  // If any group passes, the whole filter passes (OR logic between groups)
  const passed = groupResults.some(result => result.passed);
  const reason = passed
    ? `Passed: ${groupResults.find(r => r.passed)?.reason}`
    : `Failed: ${groupResults.map(r => `(${r.reason})`).join(' OR ')}`;

  console.log('Final filter evaluation result:', { passed, reason });
  
  return { passed, reason };
} 