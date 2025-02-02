import { Filter, FilterOperator } from '@/types/filters';
import prisma from '@/lib/prisma';
import get from 'lodash/get';
import { log } from '@/lib/utils';

interface WebhookData {
  [key: string]: any;
}

interface NormalizedData {
  [key: string]: string | null;
}

/**
 * Single source of truth for string normalization
 */
function normalizeForComparison(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Normalizes webhook data into a flat structure with standardized field access
 */
export function normalizeWebhookData(data: Record<string, any>): Record<string, any> {
  // Log incoming data
  log('info', 'Normalizing webhook data', { 
    input: data,
    hasContactData: !!data
  });

  // Create a clean copy of the data
  const normalized = {
    contactData: {
      ...data,  // Copy all fields directly
      PMS: data.PMS || data.propertyManagementSoftware  // Special handling for PMS
    }
  };

  // Log normalized result
  log('info', 'Data normalized', { 
    original: data,
    normalized,
    pmsValue: normalized.contactData.PMS,
    fields: Object.keys(normalized.contactData)
  });

  return normalized;
}

/**
 * Normalize a single value for comparison
 */
function normalizeValue(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().trim();
}

/**
 * Normalize all data fields recursively
 */
function normalizeData(data: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.toLowerCase().trim();
    normalized[normalizedKey] = typeof value === 'object' && value !== null
      ? normalizeData(value)
      : normalizeValue(value);
  }
  
  return normalized;
}

/**
 * Finds a field value in the data object, trying multiple formats
 */
function findFieldValue(data: Record<string, any>, field: string): string {
  const normalizedField = field.toLowerCase().trim();
  return normalizeValue(
    data[normalizedField] ||
    data.contactdata?.[normalizedField] ||
    ''
  );
}

function compareValues(actual: any, expected: any, operator: FilterOperator): { passed: boolean; reason: string } {
  // Handle null/undefined cases
  if (actual === null || actual === undefined) actual = '';
  if (expected === null || expected === undefined) expected = '';
  
  // Convert to strings and normalize
  const actualStr = normalizeValue(actual);
  const expectedStr = normalizeValue(expected);
  
  log('info', 'Comparing values', {
    original: { actual, expected },
    normalized: { actualStr, expectedStr },
    operator
  });

  switch (operator) {
    case 'equals':
      return {
        passed: actualStr === expectedStr,
        reason: actualStr === expectedStr ? 
          `Value "${actual}" equals "${expected}"` : 
          `Value "${actual}" does not equal "${expected}"`
      };

    case 'not equals':
      return {
        passed: actualStr !== expectedStr,
        reason: actualStr !== expectedStr ? 
          `Value "${actual}" does not equal "${expected}"` : 
          `Value "${actual}" equals "${expected}"`
      };

    case 'contains':
      return {
        passed: actualStr.includes(expectedStr),
        reason: actualStr.includes(expectedStr) ? 
          `Value "${actual}" contains "${expected}"` : 
          `Value "${actual}" does not contain "${expected}"`
      };

    case 'not contains':
      return {
        passed: !actualStr.includes(expectedStr),
        reason: !actualStr.includes(expectedStr) ? 
          `Value "${actual}" does not contain "${expected}"` : 
          `Value "${actual}" contains "${expected}"`
      };

    default:
      return {
        passed: false,
        reason: `Unknown operator: ${operator}`
      };
  }
}

// Evaluate a single filter
async function evaluateFilter(
  filter: Filter,
  data: Record<string, any>
): Promise<{ passed: boolean; reason: string }> {
  // Log filter evaluation start
  log('info', 'Evaluating filter', { filter });

  // Get the actual value, checking contactData first
  const actualValue = data.contactData?.[filter.field] ?? data[filter.field];
  
  // Special handling for PMS field
  const fieldValue = filter.field === 'PMS' 
    ? (data.contactData?.PMS || data.contactData?.propertyManagementSoftware || data.propertyManagementSoftware)
    : actualValue;

  // Log the value lookup
  log('info', 'Field value lookup', {
    field: filter.field,
    contactDataValue: data.contactData?.[filter.field],
    rootValue: data[filter.field],
    resolvedValue: fieldValue
  });

  // Special handling for exists/not exists
  if (filter.operator === 'exists') {
    const passed = fieldValue !== undefined && fieldValue !== null;
    return {
      passed,
      reason: `${filter.field} ${passed ? 'exists' : 'does not exist'}`
    };
  }

  if (filter.operator === 'not exists') {
    const passed = fieldValue === undefined || fieldValue === null;
    return {
      passed,
      reason: `${filter.field} ${passed ? 'does not exist' : 'exists'}`
    };
  }

  // For other operators, if value doesn't exist, fail
  if (fieldValue === undefined || fieldValue === null) {
    return {
      passed: false,
      reason: `${filter.field} is undefined or null`
    };
  }

  // Normalize values for comparison
  const normalizedActual = String(fieldValue).toLowerCase().trim();
  const normalizedExpected = String(filter.value).toLowerCase().trim();

  // Log normalized values
  log('info', 'Normalized values for comparison', {
    original: fieldValue,
    normalized: normalizedActual,
    expected: {
      original: filter.value,
      normalized: normalizedExpected
    }
  });

  // Evaluate based on operator
  switch (filter.operator) {
    case 'equals':
      return {
        passed: normalizedActual === normalizedExpected,
        reason: `${filter.field} ${normalizedActual === normalizedExpected ? 'equals' : 'does not equal'} ${filter.value}`
      };

    case 'not equals':
      return {
        passed: normalizedActual !== normalizedExpected,
        reason: `${filter.field} ${normalizedActual !== normalizedExpected ? 'does not equal' : 'equals'} ${filter.value}`
      };

    case 'contains':
      return {
        passed: normalizedActual.includes(normalizedExpected),
        reason: `${filter.field} ${normalizedActual.includes(normalizedExpected) ? 'contains' : 'does not contain'} ${filter.value}`
      };

    case 'not contains':
      return {
        passed: !normalizedActual.includes(normalizedExpected),
        reason: `${filter.field} ${!normalizedActual.includes(normalizedExpected) ? 'does not contain' : 'contains'} ${filter.value}`
      };

    default:
      log('warn', 'Unknown operator', { operator: filter.operator });
      return {
        passed: false,
        reason: `Unknown operator: ${filter.operator}`
      };
  }
}

// Normalize field names consistently
function normalizeFieldName(field: string): string {
  return field.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function getFieldMapping(systemField: string) {
  const mapping = await prisma.webhookField.findFirst({
    where: { name: normalizeFieldName(systemField) }
  });
  return mapping?.originalName;
}

// Update FilterPipeline to handle field mapping
const FilterPipeline = {
  normalize: (filter: Filter): Filter => {
    // Log incoming filter
    log('info', 'Normalizing filter', { 
      original: filter
    });

    const normalized = {
      ...filter,
      field: filter.field.toLowerCase().trim(),
      value: filter.value?.trim(),
      operator: filter.operator
    };

    // Log normalized result
    log('info', 'Normalized filter', { 
      original: filter,
      normalized
    });

    return normalized;
  },
  
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
  
  process: async (filter: Filter, data: Record<string, any>): Promise<{ passed: boolean; reason: string }> => {
    try {
      const normalized = FilterPipeline.normalize(filter);
      FilterPipeline.validate(normalized);
      
      // Get webhook field from mapping
      const webhookField = await getFieldMapping(normalized.field);
      log('info', 'Field mapping lookup result', {
        originalField: filter.field,
        normalizedField: normalized.field,
        mappedField: webhookField
      });

      if (!webhookField) {
        log('error', 'No field mapping found', { 
          systemField: normalized.field,
          availableFields: await prisma.fieldMapping.findMany().then((mappings: { systemField: string }[]) => 
            mappings.map((m: { systemField: string }) => m.systemField)
          )
        });
        return { passed: false, reason: `No mapping found for field ${normalized.field}` };
      }
      
      // Use mapped field for evaluation
      const mappedFilter = { ...normalized, field: webhookField };
      log('info', 'Processing filter with mapping', { 
        original: filter,
        normalized,
        mappedField: webhookField,
        finalFilter: mappedFilter
      });
      
      return evaluateFilter(mappedFilter, data);
    } catch (error) {
      log('error', 'Filter processing failed', { filter, error: String(error) });
      return { passed: false, reason: String(error) };
    }
  }
};

// Evaluate filter groups
export async function evaluateFilters(
  filterGroups: Array<{ logic: string; filters: Filter[] }>,
  data: Record<string, any>
): Promise<{ passed: boolean; reason: string }> {
  // Log the incoming filter groups for debugging
  log('info', 'Starting filter evaluation', { 
    filterGroups,
    hasGroups: !!filterGroups?.length,
    groupCount: filterGroups?.length || 0,
    data
  });

  // Validate filter groups
  if (!Array.isArray(filterGroups)) {
    log('warn', 'Filter groups is not an array', { filterGroups });
    return { passed: true, reason: 'No valid filters configured' };
  }

  // Remove any empty or invalid groups
  const validGroups = filterGroups.filter(group => 
    group && Array.isArray(group.filters) && group.filters.length > 0
  );

  log('info', 'Valid filter groups', {
    originalCount: filterGroups.length,
    validCount: validGroups.length,
    validGroups
  });

  if (validGroups.length === 0) {
    log('info', 'No valid filter groups found after validation');
    return { passed: true, reason: 'No filters configured' };
  }

  // Evaluate each group
  const groupResults = await Promise.all(validGroups.map(async group => {
    // Log group evaluation
    log('info', 'Evaluating filter group', {
      logic: group.logic,
      filterCount: group.filters.length,
      filters: group.filters
    });

    // Evaluate each filter in the group
    const filterResults = await Promise.all(
      group.filters.map(async filter => {
        const result = await evaluateFilter(filter, data);
        log('info', 'Filter evaluation result', {
          filter,
          result,
          data: {
            fieldValue: data[filter.field],
            contactDataValue: data.contactData?.[filter.field]
          }
        });
        return result;
      })
    );

    // Group passes if all filters pass (AND logic)
    const groupPassed = filterResults.every(r => r.passed);
    const groupReason = filterResults
      .map(r => r.reason)
      .join(' AND ');

    log('info', 'Group evaluation result', {
      passed: groupPassed,
      reason: groupReason,
      filterResults
    });

    return { passed: groupPassed, reason: groupReason };
  }));

  // Overall result passes if any group passes (OR logic between groups)
  const passed = groupResults.some(r => r.passed);
  const reason = groupResults
    .map(r => `(${r.reason})`)
    .join(' OR ');

  log('info', 'Final evaluation result', {
    passed,
    reason,
    groupResults
  });

  return { passed, reason };
} 