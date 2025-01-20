import { Filter, FilterOperator } from '@/types/filters';
import prisma from '@/lib/prisma';

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
  // Helper to check a data object for the field
  const findInObject = (obj: Record<string, any>): { exists: boolean; value: any } => {
    const normalized = normalizeValue(field);
    const entries = Object.entries(obj);
    const match = entries.find(([k]) => normalizeValue(k) === normalized);
    return {
      exists: !!match,
      value: match ? match[1] : undefined
    };
  };

  // Check top level
  const topLevel = findInObject(data);
  if (topLevel.exists) return topLevel;

  // Check contactData
  if (data.contactData && typeof data.contactData === 'object') {
    const inContactData = findInObject(data.contactData);
    if (inContactData.exists) return inContactData;
  }

  return { exists: false, value: undefined };
}

function normalizeValue(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().trim().replace(/\s+/g, ' ');
}

function compareValues(actual: string | null | undefined, expected: string | null | undefined, operator: FilterOperator): { passed: boolean; reason: string } {
  // Handle null/undefined cases
  if (actual === null || actual === undefined) actual = '';
  if (expected === null || expected === undefined) expected = '';
  
  // Convert to strings for comparison
  const actualStr = String(actual);
  const expectedStr = String(expected);
  
  // Normalize for case-insensitive comparison
  const normalizedActual = normalizeValue(actualStr);
  const normalizedExpected = normalizeValue(expectedStr);
  
  log('info', 'Comparing values', {
    original: { actual: actualStr, expected: expectedStr },
    normalized: { actual: normalizedActual, expected: normalizedExpected },
    operator
  });

  switch (operator) {
    case 'equals':
      return {
        passed: normalizedActual === normalizedExpected,
        reason: normalizedActual === normalizedExpected ? 
          `Value "${actualStr}" equals "${expectedStr}"` : 
          `Value "${actualStr}" does not equal "${expectedStr}"`
      };

    case 'not equals':
      return {
        passed: normalizedActual !== normalizedExpected,
        reason: normalizedActual !== normalizedExpected ? 
          `Value "${actualStr}" does not equal "${expectedStr}"` : 
          `Value "${actualStr}" equals "${expectedStr}"`
      };

    case 'contains':
      return {
        passed: normalizedActual.includes(normalizedExpected),
        reason: normalizedActual.includes(normalizedExpected) ? 
          `Value "${actualStr}" contains "${expectedStr}"` : 
          `Value "${actualStr}" does not contain "${expectedStr}"`
      };

    case 'not contains':
      return {
        passed: !normalizedActual.includes(normalizedExpected),
        reason: !normalizedActual.includes(normalizedExpected) ? 
          `Value "${actualStr}" does not contain "${expectedStr}"` : 
          `Value "${actualStr}" contains "${expectedStr}"`
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
  filterGroups: Array<{
    logic: string;
    filters: Filter[];
  }>,
  data: Record<string, any>
): Promise<{ passed: boolean; reason: string }> {
  log('info', 'Starting filter evaluation', { 
    groupCount: filterGroups?.length || 0,
    data 
  });

  if (!filterGroups?.length) {
    return { passed: true, reason: 'No filters configured' };
  }

  const results = await Promise.all(filterGroups.map(async group => {
    const filterResults = await Promise.all(group.filters.map(filter => 
      FilterPipeline.process(filter, data)
    ));

    const passed = filterResults.every(r => r.passed);
    return {
      passed,
      reason: filterResults.map(r => r.reason).join(' AND ')
    };
  }));

  const passed = results.some(r => r.passed);
  const reason = passed
    ? `Passed: ${results.find(r => r.passed)?.reason}`
    : `Failed: ${results.map(r => `(${r.reason})`).join(' OR ')}`;

  log('info', 'Filter evaluation complete', { passed, reason });
  return { passed, reason };
} 