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
function evaluateFilter(filter: Filter, data: Record<string, any>): { passed: boolean, reason: string } {
  // Special handling for PMS field
  const actualValue = filter.field === 'PMS' 
    ? normalizeForComparison(data.contactData?.PMS)
    : normalizeForComparison(
        data.contactData?.[filter.field] || 
        data[filter.field] || 
        ''
      );
  
  const expectedValue = normalizeForComparison(filter.value);
  
  log('info', 'Filter evaluation', {
    field: filter.field,
    operator: filter.operator,
    rawActual: filter.field === 'PMS' ? data.contactData?.PMS : data.contactData?.[filter.field],
    rawExpected: filter.value,
    normalizedActual: actualValue,
    normalizedExpected: expectedValue,
    passed: actualValue === expectedValue
  });

  switch (filter.operator) {
    case 'exists':
      return { 
        passed: actualValue !== '', 
        reason: `Field ${filter.field} ${actualValue !== '' ? 'exists' : 'does not exist'}`
      };
    case 'not exists':
      return { 
        passed: actualValue === '', 
        reason: `Field ${filter.field} ${actualValue === '' ? 'does not exist' : 'exists'}`
      };
    case 'equals':
      return { 
        passed: actualValue === expectedValue,
        reason: `${filter.field}: "${actualValue}" ${actualValue === expectedValue ? '=' : '≠'} "${expectedValue}"`
      };
    case 'not equals':
      return { 
        passed: actualValue !== expectedValue,
        reason: `${filter.field}: "${actualValue}" ${actualValue !== expectedValue ? '≠' : '='} "${expectedValue}"`
      };
    default:
      return { passed: false, reason: `Unknown operator: ${filter.operator}` };
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

// Evaluate filter groups
export async function evaluateFilters(
  filterGroups: Array<{ logic: string; filters: Filter[] }>,
  data: Record<string, any>
): Promise<{ passed: boolean; reason: string }> {
  if (!filterGroups?.length) {
    return { passed: true, reason: 'No filters configured' };
  }

  const groupResults = filterGroups.map(group => {
    const filterResults = group.filters.map(filter => 
      evaluateFilter(filter, data)
    );
    
    const groupPassed = filterResults.every(r => r.passed);
    const groupReason = filterResults
      .map(r => r.reason)
      .join(' AND ');
      
    return { passed: groupPassed, reason: groupReason };
  });

  const passed = groupResults.some(r => r.passed);
  const reason = groupResults
    .map(r => `(${r.reason})`)
    .join(' OR ');

  log('info', 'Filter evaluation complete', {
    passed,
    reason,
    groupResults
  });

  return { passed, reason };
} 