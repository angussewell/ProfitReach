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
): Promise<{ passed: boolean; reason: string; details?: any }> {
  // Log filter evaluation start with complete data structure
  log('info', 'Evaluating filter', { 
    filter,
    dataStructure: {
      keys: Object.keys(data),
      hasContactData: 'contactData' in data,
      topLevelFields: Object.keys(data)
    }
  });

  // Get the actual value - try both direct access and contactData
  const fieldValue = data[filter.field] || data.contactData?.[filter.field];

  // Log the value lookup attempt
  log('info', 'Field value lookup result', {
    field: filter.field,
    directValue: data[filter.field],
    contactDataValue: data.contactData?.[filter.field],
    resolvedValue: fieldValue,
    filterValue: filter.value,
    operator: filter.operator
  });

  // Special handling for exists/not exists
  if (filter.operator === 'exists') {
    const exists = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    log('info', 'Evaluating exists operator', {
      field: filter.field,
      value: fieldValue,
      exists,
      details: {
        isUndefined: fieldValue === undefined,
        isNull: fieldValue === null,
        isEmpty: fieldValue === '',
        type: typeof fieldValue
      }
    });
    return {
      passed: exists,
      reason: `${filter.field} ${exists ? 'exists' : 'does not exist'}`,
      details: {
        field: filter.field,
        value: fieldValue,
        operator: filter.operator,
        dataStructure: {
          hasDirectField: filter.field in data,
          hasContactDataField: data.contactData && filter.field in data.contactData,
          fieldValue,
          exists
        }
      }
    };
  }

  if (filter.operator === 'not exists') {
    const exists = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    log('info', 'Evaluating not exists operator', {
      field: filter.field,
      value: fieldValue,
      exists,
      details: {
        isUndefined: fieldValue === undefined,
        isNull: fieldValue === null,
        isEmpty: fieldValue === '',
        type: typeof fieldValue
      }
    });
    return {
      passed: !exists,
      reason: `${filter.field} ${!exists ? 'does not exist' : 'exists'}`,
      details: {
        field: filter.field,
        value: fieldValue,
        operator: filter.operator,
        dataStructure: {
          hasDirectField: filter.field in data,
          hasContactDataField: data.contactData && filter.field in data.contactData,
          fieldValue,
          exists
        }
      }
    };
  }

  // For other operators, if value doesn't exist, fail
  if (fieldValue === undefined || fieldValue === null) {
    return {
      passed: false,
      reason: `${filter.field} is undefined or null`,
      details: {
        field: filter.field,
        value: fieldValue,
        operator: filter.operator,
        expectedValue: filter.value
      }
    };
  }

  // Normalize values for comparison
  const normalizedActual = String(fieldValue).toLowerCase().trim();
  const normalizedExpected = String(filter.value).toLowerCase().trim();

  // Log normalized values
  log('info', 'Normalized values for comparison', {
    field: filter.field,
    original: {
      actual: fieldValue,
      expected: filter.value
    },
    normalized: {
      actual: normalizedActual,
      expected: normalizedExpected
    }
  });

  // Evaluate based on operator
  const evaluationResult = {
    field: filter.field,
    originalValue: fieldValue,
    normalizedValue: normalizedActual,
    expectedValue: filter.value,
    normalizedExpected: normalizedExpected,
    operator: filter.operator
  };

  switch (filter.operator) {
    case 'equals':
      return {
        passed: normalizedActual === normalizedExpected,
        reason: `${filter.field} ${normalizedActual === normalizedExpected ? 'equals' : 'does not equal'} ${filter.value}`,
        details: evaluationResult
      };

    case 'not equals':
      return {
        passed: normalizedActual !== normalizedExpected,
        reason: `${filter.field} ${normalizedActual !== normalizedExpected ? 'does not equal' : 'equals'} ${filter.value}`,
        details: evaluationResult
      };

    case 'contains':
      return {
        passed: normalizedActual.includes(normalizedExpected),
        reason: `${filter.field} ${normalizedActual.includes(normalizedExpected) ? 'contains' : 'does not contain'} ${filter.value}`,
        details: evaluationResult
      };

    case 'not contains':
      return {
        passed: !normalizedActual.includes(normalizedExpected),
        reason: `${filter.field} ${!normalizedActual.includes(normalizedExpected) ? 'does not contain' : 'contains'} ${filter.value}`,
        details: evaluationResult
      };

    default:
      log('warn', 'Unknown operator', { operator: filter.operator });
      return {
        passed: false,
        reason: `Unknown operator: ${filter.operator}`,
        details: evaluationResult
      };
  }
}

// Normalize field names consistently
function normalizeFieldName(field: string): string {
  return field.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function getFieldMapping(systemField: string) {
  const mapping = await prisma.webhookField.findFirst({
    where: { 
      OR: [
        { name: normalizeFieldName(systemField) },
        { originalName: systemField }
      ]
    }
  });
  return mapping?.originalName || systemField;
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
      field: filter.field,  // Don't lowercase the field name anymore
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
          availableFields: await prisma.fieldMapping.findMany().then(mappings => 
            mappings.map(m => m.name)
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
  filters: Filter[],
  data: Record<string, any>
): Promise<{
  passed: boolean;
  results: Array<{
    filter: Filter;
    passed: boolean;
    reason: string;
    details: {
      originalValue: any;
      normalizedValue: string;
      expectedValue: string;
      normalizedExpected: string;
      fieldPath: string;
      dataStructure: {
        hasDirectField: boolean;
        hasContactDataField: boolean;
        availableFields: string[];
      };
    };
  }>;
  summary: {
    totalFilters: number;
    passedFilters: number;
    failedFilters: number;
    evaluationTime: string;
  };
}> {
  const startTime = Date.now();

  // Log start of filter evaluation
  log('info', 'Starting filter evaluation', {
    filterCount: filters.length,
    dataFields: Object.keys(data)
  });

  // Evaluate each filter
  const results = await Promise.all(
    filters.map(async (filter) => {
      const result = await evaluateFilter(filter, data);
      
      // Get the actual value - try both direct access and contactData
      const fieldValue = data[filter.field] || data.contactData?.[filter.field];
      
      return {
        filter,
        passed: result.passed,
        reason: result.reason,
        details: {
          originalValue: fieldValue,
          normalizedValue: normalizeValue(fieldValue),
          expectedValue: filter.value,
          normalizedExpected: normalizeValue(filter.value),
          fieldPath: filter.field,
          dataStructure: {
            hasDirectField: filter.field in data,
            hasContactDataField: data.contactData && filter.field in data.contactData,
            availableFields: Object.keys(data).concat(Object.keys(data.contactData || {}))
          }
        }
      };
    })
  );

  const allPassed = results.every((r) => r.passed);
  const endTime = Date.now();

  // Create summary
  const summary = {
    totalFilters: filters.length,
    passedFilters: results.filter(r => r.passed).length,
    failedFilters: results.filter(r => !r.passed).length,
    evaluationTime: `${endTime - startTime}ms`
  };

  // Log evaluation results
  log('info', 'Filter evaluation complete', {
    passed: allPassed,
    summary,
    results: results.map(r => ({
      field: r.filter.field,
      operator: r.filter.operator,
      value: r.filter.value,
      passed: r.passed,
      reason: r.reason,
      details: r.details
    }))
  });

  return {
    passed: allPassed,
    results,
    summary
  };
} 