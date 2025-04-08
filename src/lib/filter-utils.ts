import { FilterCondition, FilterState, FilterOperator, Filter } from '@/types/filters';
import { Prisma } from '@prisma/client';
import { log } from '@/lib/utils';

/**
 * Normalizes webhook data for filter evaluation
 * @param data - The raw webhook data
 * @returns Normalized data object
 */
export function normalizeWebhookData(data: Record<string, any>) {
  const normalizedData: Record<string, any> = {
    contactData: {},
    metadata: {
      timestamp: new Date().toISOString(),
      source: 'webhook'
    }
  };

  // Process all keys in the data object
  Object.entries(data).forEach(([key, value]) => {
    // Normalize key name by removing spaces and special characters
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Add to normalized data
    normalizedData.contactData[normalizedKey] = value;
    
    // Also keep the original key for backward compatibility
    normalizedData.contactData[key] = value;
  });

  return normalizedData;
}

/**
 * Evaluates a set of filters against normalized data
 * @param filters - Array of filters to evaluate
 * @param normalizedData - Normalized data to test against
 * @returns Result of filter evaluation
 */
export async function evaluateFilters(
  filters: Filter[],
  normalizedData: Record<string, any>
) {
  // If no filters, always pass
  if (!filters || filters.length === 0) {
    return {
      passed: true,
      reason: 'No filters to evaluate',
      results: [],
      summary: 'All conditions passed (no filters)'
    };
  }

  // Group filters by group ID
  const filterGroups: Record<string, Filter[]> = {};
  filters.forEach(filter => {
    const group = filter.group || 'default';
    if (!filterGroups[group]) {
      filterGroups[group] = [];
    }
    filterGroups[group].push(filter);
  });

  // Evaluate each filter
  const allResults: Array<{ filter: Filter; passed: boolean; reason: string }> = [];
  let allPassed = true;
  
  // Process each group
  for (const [groupId, groupFilters] of Object.entries(filterGroups)) {
    let groupPassed = true;
    
    // Evaluate each filter in the group
    for (const filter of groupFilters) {
      try {
        const { field, operator, value } = filter;
        
        // Get the field value from normalized data
        const fieldValue = normalizedData.contactData[field] || 
                           normalizedData.contactData[field.toLowerCase()] || 
                           normalizedData.contactData[field.toLowerCase().replace(/[^a-z0-9]/g, '')];

        // Evaluate based on operator
        let passed = false;
        let reason = '';
        
        switch (operator) {
          case 'equals':
            passed = fieldValue === value;
            reason = passed ? `${field} equals ${value}` : `${field} does not equal ${value}`;
            break;
          case 'notEquals':
            passed = fieldValue !== value;
            reason = passed ? `${field} does not equal ${value}` : `${field} equals ${value}`;
            break;
          case 'contains':
            passed = typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(String(value).toLowerCase());
            reason = passed ? `${field} contains ${value}` : `${field} does not contain ${value}`;
            break;
          case 'notContains':
            passed = typeof fieldValue !== 'string' || !fieldValue.toLowerCase().includes(String(value).toLowerCase());
            reason = passed ? `${field} does not contain ${value}` : `${field} contains ${value}`;
            break;
          case 'startsWith':
            passed = typeof fieldValue === 'string' && fieldValue.toLowerCase().startsWith(String(value).toLowerCase());
            reason = passed ? `${field} starts with ${value}` : `${field} does not start with ${value}`;
            break;
          case 'endsWith':
            passed = typeof fieldValue === 'string' && fieldValue.toLowerCase().endsWith(String(value).toLowerCase());
            reason = passed ? `${field} ends with ${value}` : `${field} does not end with ${value}`;
            break;
          case 'isEmpty':
            passed = fieldValue === undefined || fieldValue === null || fieldValue === '';
            reason = passed ? `${field} is empty` : `${field} is not empty`;
            break;
          case 'isNotEmpty':
            passed = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
            reason = passed ? `${field} is not empty` : `${field} is empty`;
            break;
          default:
            reason = `Unsupported operator: ${operator}`;
            passed = false;
        }
        
        // Add to results
        allResults.push({ filter, passed, reason });
        
        // Update group status
        if (!passed) {
          groupPassed = false;
        }
      } catch (error) {
        log('error', `Filter evaluation error for ${filter.field}`, { error: String(error), filter });
        allResults.push({ 
          filter, 
          passed: false, 
          reason: `Error evaluating filter: ${String(error)}` 
        });
        groupPassed = false;
      }
    }
    
    // If this group failed, the whole evaluation fails (groups are OR'ed together)
    if (!groupPassed) {
      allPassed = false;
    }
  }

  // Create summary
  const passedCount = allResults.filter(r => r.passed).length;
  const summary = allPassed
    ? `All conditions passed (${passedCount}/${allResults.length})`
    : `Some conditions failed (${passedCount}/${allResults.length})`;

  return {
    passed: allPassed,
    reason: allPassed ? 'All filter groups passed' : 'Some filter groups failed',
    results: allResults,
    summary
  };
}

/**
 * Helper function to generate a unique ID for filters
 */
export function generateFilterId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Creates a new Filter object with a unique ID
 */
export function createFilter(field: string, operator: FilterOperator, value?: any): Filter {
  return {
    id: generateFilterId(),
    field,
    operator,
    value,
  };
}

/**
 * Converts a set of filter conditions to a Prisma where object
 */
export function buildPrismaWhereFromFilters(
  filterState: FilterState,
  organizationId: string
): any {
  // Start with the required organizationId filter
  const where: any = {
    organizationId
  };

  if (!filterState.conditions || filterState.conditions.length === 0) {
    return where;
  }

  // Build an array of conditions
  const conditions = filterState.conditions.map(condition => 
    buildPrismaCondition(condition)
  ).filter(Boolean);

  if (conditions.length === 0) {
    return where;
  }

  // Combine conditions with AND or OR
  if (filterState.logicalOperator === 'OR') {
    where.OR = conditions;
  } else {
    where.AND = conditions;
  }

  return where;
}

/**
 * Build a single Prisma condition from a filter condition
 */
function buildPrismaCondition(condition: FilterCondition): any {
  const { field, operator, value } = condition;
  
  // Handle tags separately
  if (field === 'tags') {
    return buildTagsCondition(operator, value);
  }
  
  // Check if this is a field in additionalData
  if (field === 'status') {
    return buildJsonFieldCondition(field, operator, value);
  }
  
  // Handle date fields
  if (['createdAt', 'updatedAt', 'lastActivityAt'].includes(field)) {
    return buildDateCondition(field, operator, value);
  }
  
  // Handle empty/not empty operators
  if (operator === 'isEmpty') {
    return { [field]: { equals: null } };
  }
  
  if (operator === 'isNotEmpty') {
    return { [field]: { not: null } };
  }
  
  // Need a value for the remaining operators
  if (value === null || value === undefined) {
    return null;
  }
  
  // Map operators to Prisma operators
  switch (operator) {
    case 'equals':
      return { [field]: { equals: value } };
    case 'notEquals':
      return { [field]: { not: value } };
    case 'contains':
      return { [field]: { contains: value, mode: 'insensitive' } };
    case 'notContains':
      return { [field]: { not: { contains: value, mode: 'insensitive' } } };
    case 'startsWith':
      return { [field]: { startsWith: value, mode: 'insensitive' } };
    case 'endsWith':
      return { [field]: { endsWith: value, mode: 'insensitive' } };
    case 'greaterThan':
      return { [field]: { gt: Number(value) } };
    case 'lessThan':
      return { [field]: { lt: Number(value) } };
    case 'isAfter':
      return { [field]: { gt: new Date(value as string) } };
    case 'isBefore':
      return { [field]: { lt: new Date(value as string) } };
    default:
      return null;
  }
}

/**
 * Build a condition for a JSON field (additionalData)
 */
function buildJsonFieldCondition(field: string, operator: string, value: any): any {
  // For additionalData.status
  if (field === 'status') {
    // Handle empty/not empty operators
    if (operator === 'isEmpty') {
      return {
        OR: [
          { additionalData: { path: ['status'], equals: null } },
          { additionalData: { path: ['status'], equals: '' } },
          { additionalData: { equals: {} } },
          { additionalData: { equals: null } }
        ]
      };
    }
    
    if (operator === 'isNotEmpty') {
      return {
        AND: [
          { additionalData: { path: ['status'], not: null } },
          { additionalData: { path: ['status'], not: '' } }
        ]
      };
    }
    
    // Map operators to JSON path operators
    switch (operator) {
      case 'equals':
        return {
          additionalData: {
            path: ['status'],
            equals: value
          }
        };
      case 'notEquals':
        return {
          additionalData: {
            path: ['status'],
            not: value
          }
        };
      case 'contains':
        return {
          additionalData: {
            path: ['status'],
            string_contains: value
          }
        };
      case 'notContains':
        return {
          additionalData: {
            path: ['status'],
            not: { string_contains: value }
          }
        };
      case 'startsWith':
        return {
          additionalData: {
            path: ['status'],
            string_starts_with: value
          }
        };
      case 'endsWith':
        return {
          additionalData: {
            path: ['status'],
            string_ends_with: value
          }
        };
      default:
        return null;
    }
  }
  
  return null;
}

/**
 * Builds a SQL WHERE clause for the raw query approach 
 * (Used as alternative if Prisma Client filtering is not sufficient)
 */
export function buildSqlWhereFromFilters(
  filterState: FilterState,
  organizationId: string
): { sql: string, params: any[] } {
  // Start with the base WHERE clause for organization
  let sql = `WHERE "organizationId" = $1`;
  const params: any[] = [organizationId];
  
  if (!filterState.conditions || filterState.conditions.length === 0) {
    return { sql, params };
  }
  
  // Process each condition
  const conditionSql: string[] = [];
  
  filterState.conditions.forEach(condition => {
    const { field, operator, value } = condition;
    const paramIndex = params.length + 1;
    
    // Handle JSON fields (additionalData)
    if (field === 'status') {
      const jsonCondition = buildJsonFieldSqlCondition(
        field, 
        operator, 
        value, 
        paramIndex
      );
      
      if (jsonCondition) {
        conditionSql.push(jsonCondition.sql);
        if (jsonCondition.param !== undefined) {
          params.push(jsonCondition.param);
        }
      }
      return;
    }
    
    // Handle standard fields
    const fieldCondition = buildFieldSqlCondition(
      field, 
      operator, 
      value, 
      paramIndex
    );
    
    if (fieldCondition) {
      conditionSql.push(fieldCondition.sql);
      if (fieldCondition.param !== undefined) {
        params.push(fieldCondition.param);
      }
    }
  });
  
  if (conditionSql.length > 0) {
    // Combine using AND or OR
    const combiner = filterState.logicalOperator === 'OR' ? ' OR ' : ' AND ';
    sql += ` AND (${conditionSql.join(combiner)})`;
  }
  
  return { sql, params };
}

/**
 * Build SQL condition for a standard field
 */
function buildFieldSqlCondition(
  field: string, 
  operator: string, 
  value: any, 
  paramIndex: number
): { sql: string, param?: any } | null {
  // Safe field name - whitelist of allowed fields to prevent SQL injection
  const safeFieldName = getSafeFieldName(field);
  if (!safeFieldName) return null;
  
  // Handle empty/not empty operators
  if (operator === 'isEmpty') {
    return { sql: `${safeFieldName} IS NULL OR ${safeFieldName} = ''` };
  }
  
  if (operator === 'isNotEmpty') {
    return { sql: `${safeFieldName} IS NOT NULL AND ${safeFieldName} <> ''` };
  }
  
  // Need a value for remaining operators
  if (value === null || value === undefined) {
    return null;
  }
  
  // Map operators to SQL operators
  switch (operator) {
    case 'equals':
      return { sql: `${safeFieldName} = $${paramIndex}`, param: value };
    case 'notEquals':
      return { sql: `${safeFieldName} <> $${paramIndex}`, param: value };
    case 'contains':
      return { 
        sql: `${safeFieldName} ILIKE $${paramIndex}`, 
        param: `%${value}%` 
      };
    case 'notContains':
      return { 
        sql: `${safeFieldName} NOT ILIKE $${paramIndex}`, 
        param: `%${value}%` 
      };
    case 'startsWith':
      return { 
        sql: `${safeFieldName} ILIKE $${paramIndex}`, 
        param: `${value}%` 
      };
    case 'endsWith':
      return { 
        sql: `${safeFieldName} ILIKE $${paramIndex}`, 
        param: `%${value}` 
      };
    case 'greaterThan':
      return { 
        sql: `${safeFieldName} > $${paramIndex}`, 
        param: Number(value) 
      };
    case 'lessThan':
      return { 
        sql: `${safeFieldName} < $${paramIndex}`, 
        param: Number(value) 
      };
    case 'isAfter':
      return { 
        sql: `${safeFieldName} > $${paramIndex}`, 
        param: new Date(value as string) 
      };
    case 'isBefore':
      return { 
        sql: `${safeFieldName} < $${paramIndex}`, 
        param: new Date(value as string) 
      };
    default:
      return null;
  }
}

/**
 * Build SQL condition for a JSON field
 */
function buildJsonFieldSqlCondition(
  field: string, 
  operator: string, 
  value: any, 
  paramIndex: number
): { sql: string, param?: any } | null {
  // For additionalData.status
  if (field === 'status') {
    // Handle empty/not empty
    if (operator === 'isEmpty') {
      return { 
        sql: `"additionalData"->>'status' IS NULL OR "additionalData"->>'status' = '' OR "additionalData" IS NULL OR "additionalData" = '{}'::jsonb` 
      };
    }
    
    if (operator === 'isNotEmpty') {
      return { 
        sql: `"additionalData"->>'status' IS NOT NULL AND "additionalData"->>'status' <> ''` 
      };
    }
    
    // Map operators to JSON operators
    switch (operator) {
      case 'equals':
        return { 
          sql: `"additionalData"->>'status' = $${paramIndex}`, 
          param: value 
        };
      case 'notEquals':
        return { 
          sql: `"additionalData"->>'status' <> $${paramIndex}`, 
          param: value 
        };
      case 'contains':
        return { 
          sql: `"additionalData"->>'status' ILIKE $${paramIndex}`, 
          param: `%${value}%` 
        };
      case 'notContains':
        return { 
          sql: `"additionalData"->>'status' NOT ILIKE $${paramIndex}`, 
          param: `%${value}%` 
        };
      case 'startsWith':
        return { 
          sql: `"additionalData"->>'status' ILIKE $${paramIndex}`, 
          param: `${value}%` 
        };
      case 'endsWith':
        return { 
          sql: `"additionalData"->>'status' ILIKE $${paramIndex}`, 
          param: `%${value}` 
        };
      default:
        return null;
    }
  }
  
  return null;
}

/**
 * Get a safe field name for SQL queries
 * This is a security measure to prevent SQL injection
 */
function getSafeFieldName(field: string): string | null {
  // Whitelist of allowed field names
  const allowedFields = [
    'firstName', 'lastName', 'email', 'title', 'currentCompanyName',
    'leadStatus', 'city', 'state', 'country', 'createdAt', 'updatedAt', 
    'lastActivityAt'
  ];
  
  if (allowedFields.includes(field)) {
    return `"${field}"`; // Return with quotes for PostgreSQL
  }
  
  return null;
}

/**
 * Builds a Prisma condition for filtering by tags
 */
function buildTagsCondition(operator: string, value: any): any {
  if (!value) return null;
  
  // Convert value to array of tag names if it's a string
  const tagNames = typeof value === 'string' 
    ? value.split(',').map(s => s.trim()).filter(Boolean)
    : Array.isArray(value) ? value : [value];
  
  if (tagNames.length === 0) return null;
  
  switch(operator) {
    case 'hasAllTags':
      return {
        ContactTags: {
          every: {
            Tags: {
              name: {
                in: tagNames
              }
            }
          }
        }
      };
    
    case 'hasAnyTags':
      return {
        ContactTags: {
          some: {
            Tags: {
              name: {
                in: tagNames
              }
            }
          }
        }
      };
      
    case 'hasNoneTags':
      return {
        ContactTags: {
          none: {
            Tags: {
              name: {
                in: tagNames
              }
            }
          }
        }
      };
      
    case 'isEmpty':
      return {
        ContactTags: {
          none: {}
        }
      };
      
    case 'isNotEmpty':
      return {
        ContactTags: {
          some: {}
        }
      };
      
    default:
      return null;
  }
}

/**
 * Builds a SQL condition for filtering by tags
 */
function buildTagsSqlCondition(
  operator: string,
  value: any,
  paramIndex: number
): { sql: string, param?: any } | null {
  if (!value && operator !== 'isEmpty' && operator !== 'isNotEmpty') {
    return null;
  }
  
  // Convert value to array of tag names if it's a string
  const tagNames = typeof value === 'string' 
    ? value.split(',').map(s => s.trim()).filter(Boolean)
    : Array.isArray(value) ? value : [value];
  
  switch(operator) {
    case 'hasAllTags':
      // This requires a subquery to count the matches and ensure they equal the number of tags requested
      return { 
        sql: `(
          SELECT COUNT(DISTINCT t."name") 
          FROM "ContactTags" ct 
          JOIN "Tags" t ON ct."tagId" = t."id" 
          WHERE ct."contactId" = "Contacts"."id" AND t."name" = ANY($${paramIndex}::text[])
        ) = $${paramIndex + 1}`,
        param: [tagNames, tagNames.length]
      };
      
    case 'hasAnyTags':
      return { 
        sql: `EXISTS (
          SELECT 1 FROM "ContactTags" ct 
          JOIN "Tags" t ON ct."tagId" = t."id" 
          WHERE ct."contactId" = "Contacts"."id" AND t."name" = ANY($${paramIndex}::text[])
        )`,
        param: tagNames
      };
      
    case 'hasNoneTags':
      return { 
        sql: `NOT EXISTS (
          SELECT 1 FROM "ContactTags" ct 
          JOIN "Tags" t ON ct."tagId" = t."id" 
          WHERE ct."contactId" = "Contacts"."id" AND t."name" = ANY($${paramIndex}::text[])
        )`,
        param: tagNames
      };
      
    case 'isEmpty':
      return { 
        sql: `NOT EXISTS (
          SELECT 1 FROM "ContactTags" ct 
          WHERE ct."contactId" = "Contacts"."id"
        )`
      };
      
    case 'isNotEmpty':
      return { 
        sql: `EXISTS (
          SELECT 1 FROM "ContactTags" ct 
          WHERE ct."contactId" = "Contacts"."id"
        )`
      };
      
    default:
      return null;
  }
}

/**
 * Build a condition specifically for date fields
 */
function buildDateCondition(field: string, operator: string, value: any): any {
  // Handle empty checks
  if (operator === 'isEmpty') {
    return { [field]: { equals: null } };
  }
  
  if (operator === 'isNotEmpty') {
    return { [field]: { not: null } };
  }
  
  // Need a value for the remaining operators (except isEmpty/isNotEmpty)
  if (value === null || value === undefined) {
    return null;
  }
  
  // Map operators to Prisma date operators
  switch (operator) {
    case 'equals': {
      try {
        // For equals, we want to match the entire day
        const date = new Date(value as string);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        return { 
          [field]: { 
            gte: startOfDay,
            lte: endOfDay
          } 
        };
      } catch (e) {
        console.error('Invalid date value for equals:', value);
        return null;
      }
    }
      
    case 'notEquals': {
      try {
        const date = new Date(value as string);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        return { 
          OR: [
            { [field]: { lt: startOfDay } },
            { [field]: { gt: endOfDay } }
          ]
        };
      } catch (e) {
        console.error('Invalid date value for notEquals:', value);
        return null;
      }
    }
      
    case 'isAfter': {
      try {
        const date = new Date(value as string);
        return { [field]: { gt: date } };
      } catch (e) {
        console.error('Invalid date value for isAfter:', value);
        return null;
      }
    }
      
    case 'isBefore': {
      try {
        const date = new Date(value as string);
        return { [field]: { lt: date } };
      } catch (e) {
        console.error('Invalid date value for isBefore:', value);
        return null;
      }
    }
      
    case 'between': {
      if (!Array.isArray(value) || value.length !== 2) {
        console.error('Invalid date range for between:', value);
        return null;
      }
      
      try {
        const startDate = new Date(value[0]);
        const endDate = new Date(value[1]);
        
        return { 
          [field]: { 
            gte: startDate,
            lte: endDate
          } 
        };
      } catch (e) {
        console.error('Invalid date range for between:', value);
        return null;
      }
    }
      
    default:
      return null;
  }
}
