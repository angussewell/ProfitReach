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
 * Evaluates a single filter against normalized data
 */
function evaluateFilter(
  filter: Filter,
  normalizedData: Record<string, any>
): { passed: boolean; reason: string } {
  // Log the start of filter evaluation
  console.log('Evaluating filter:', {
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
  console.log('Field value found:', {
    field: filter.field,
    variations: fieldVariations,
    exists: fieldExists,
    value: fieldValue
  });

  switch (filter.operator) {
    case 'exists':
      console.log('Exists check result:', { fieldExists });
      return {
        passed: fieldExists,
        reason: fieldExists ? 
          `Field ${filter.field} exists with value ${fieldValue}` : 
          `Field ${filter.field} does not exist`
      };

    case 'not exists':
      console.log('Not exists check result:', { fieldExists });
      return {
        passed: !fieldExists,
        reason: !fieldExists ? 
          `Field ${filter.field} does not exist` : 
          `Field ${filter.field} exists with value ${fieldValue}`
      };

    case 'equals':
      const equals = String(fieldValue).toLowerCase() === String(filter.value).toLowerCase();
      console.log('Equals check result:', { 
        fieldValue: String(fieldValue).toLowerCase(), 
        compareValue: String(filter.value).toLowerCase(),
        equals 
      });
      return {
        passed: equals,
        reason: equals ? 
          `Field ${filter.field} equals ${filter.value}` : 
          `Field ${filter.field} (${fieldValue}) does not equal ${filter.value}`
      };

    case 'not equals':
      const notEquals = String(fieldValue).toLowerCase() !== String(filter.value).toLowerCase();
      console.log('Not equals check result:', { 
        fieldValue: String(fieldValue).toLowerCase(), 
        compareValue: String(filter.value).toLowerCase(),
        notEquals 
      });
      return {
        passed: notEquals,
        reason: notEquals ? 
          `Field ${filter.field} (${fieldValue}) is not equal to ${filter.value}` : 
          `Field ${filter.field} equals ${filter.value}`
      };

    case 'contains':
      const contains = String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
      console.log('Contains check result:', { 
        fieldValue: String(fieldValue).toLowerCase(), 
        searchValue: String(filter.value).toLowerCase(),
        contains 
      });
      return {
        passed: contains,
        reason: contains ? 
          `Field ${filter.field} contains ${filter.value}` : 
          `Field ${filter.field} (${fieldValue}) does not contain ${filter.value}`
      };

    case 'not contains':
      const notContains = !String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
      console.log('Not contains check result:', { 
        fieldValue: String(fieldValue).toLowerCase(), 
        searchValue: String(filter.value).toLowerCase(),
        notContains 
      });
      return {
        passed: notContains,
        reason: notContains ? 
          `Field ${filter.field} does not contain ${filter.value}` : 
          `Field ${filter.field} (${fieldValue}) contains ${filter.value}`
      };

    default:
      console.log('Unknown operator:', filter.operator);
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