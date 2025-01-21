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
 * Normalizes webhook data into a flat structure with standardized field access
 */
function normalizeWebhookData(data: Record<string, any>): Record<string, any> {
  // Create a clean copy of the data
  const normalized = {
    contactData: { ...data.contactData } || {}
  };

  // Handle PMS field variations
  normalized.contactData.PMS = 
    data.contactData?.PMS || 
    data.contactData?.propertyManagementSoftware || 
    data.propertyManagementSoftware ||
    normalized.contactData.PMS;

  log('info', 'Normalized webhook data', { 
    original: data,
    normalized,
    pmsValue: normalized.contactData.PMS
  });

  return normalized;
}

/**
 * Finds a field value in the data object, trying multiple formats
 */
function findFieldValue(data: Record<string, any>, field: string): { exists: boolean; value: any } {
  // For PMS field, always look in contactData
  if (field === 'PMS') {
    const value = data.contactData?.PMS;
    const exists = value !== undefined && value !== null;
    return { exists, value };
  }

  // For other fields, use lodash get
  const value = get(data, field);
  const exists = value !== undefined && value !== null;
  
  log('info', 'Field lookup result', {
    field,
    exists,
    value,
    data: JSON.stringify(data)
  });

  return { exists, value };
}

function normalizeValue(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().trim();
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

function evaluateFilter(filter: Filter, data: Record<string, any>): { passed: boolean; reason: string } {
  const { exists, value } = findFieldValue(data, filter.field);
  
  log('info', 'Evaluating filter', {
    field: filter.field,
    operator: filter.operator,
    expectedValue: filter.value,
    actualValue: value,
    exists
  });

  switch (filter.operator) {
    case 'exists':
      return {
        passed: exists,
        reason: exists ? 
          `Field ${filter.field} exists with value ${value}` : 
          `Field ${filter.field} does not exist`
      };

    case 'not exists':
      return {
        passed: !exists,
        reason: !exists ? 
          `Field ${filter.field} does not exist` : 
          `Field ${filter.field} exists with value ${value}`
      };

    default:
      if (!exists) {
        return {
          passed: false,
          reason: `Field ${filter.field} does not exist`
        };
      }
      return compareValues(value, filter.value, filter.operator);
  }
}

// Add field mapping lookup
async function getFieldMapping(systemField: string) {
  const mapping = await prisma.fieldMapping.findFirst({
    where: { systemField }
  });
  return mapping?.webhookField;
}

// Update FilterPipeline to handle field mapping
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
  
  process: async (filter: Filter, data: Record<string, any>): Promise<{ passed: boolean; reason: string }> => {
    try {
      const normalized = FilterPipeline.normalize(filter);
      FilterPipeline.validate(normalized);
      
      // Get webhook field from mapping
      const webhookField = await getFieldMapping(normalized.field);
      if (!webhookField) {
        log('error', 'No field mapping found', { systemField: normalized.field });
        return { passed: false, reason: `No mapping found for field ${normalized.field}` };
      }
      
      // Use mapped field for evaluation
      const mappedFilter = { ...normalized, field: webhookField };
      log('info', 'Processing filter with mapping', { 
        original: filter,
        normalized,
        mappedField: webhookField
      });
      
      return evaluateFilter(mappedFilter, data);
    } catch (error) {
      log('error', 'Filter processing failed', { filter, error: String(error) });
      return { passed: false, reason: String(error) };
    }
  }
};

/**
 * Evaluates all filter groups (OR logic between groups)
 */
export async function evaluateFilters(
  filters: Filter[] | Array<{ logic: string; filters: Filter[] }>,
  data: Record<string, any>
): Promise<{ passed: boolean; reason: string }> {
  log('info', 'Starting filter evaluation', { filters, data });

  // Handle empty filters
  if (!filters?.length) {
    return { passed: true, reason: 'No filters configured' };
  }

  // Normalize to filter groups structure
  const filterGroups = Array.isArray(filters) && !('logic' in filters[0])
    ? [{ logic: 'AND', filters: filters as Filter[] }]
    : filters as Array<{ logic: string; filters: Filter[] }>;

  const results = filterGroups.map(group => {
    const filterResults = group.filters.map(filter => 
      evaluateFilter(filter, data)
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