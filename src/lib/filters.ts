import { FilterState } from '@/types/filters';
import { Prisma } from '@prisma/client';

/**
 * Builds a Prisma where object from a FilterState and organizationId
 * This is the preferred method for building queries as it's type-safe
 */
export function buildPrismaWhereFromFilters(
  filterState: FilterState | null | undefined,
  organizationId: string
): Prisma.ContactsWhereInput {
  // Base filter - always filter by organizationId for security
  const baseWhere: Prisma.ContactsWhereInput = {
    organizationId,
  };

  // If no filter state or no conditions, return just the base filter
  if (!filterState?.conditions || filterState.conditions.length === 0) {
    return baseWhere;
  }

  // Build conditions based on the filter state
  const conditions = filterState.conditions.map(condition => {
    const { field, operator, value } = condition;

    // Validate field is in our whitelist of allowed fields
    const allowedFields = [
      'firstName', 'lastName', 'email', 'title', 'currentCompanyName',
      'leadStatus', 'city', 'state', 'country', 'createdAt', 'updatedAt', 
      'lastActivityAt'
    ];
    
    if (!allowedFields.includes(field)) {
      return {}; // Skip this condition if field isn't allowed
    }

    switch (operator) {
      case 'equals':
        return {
          [field]: {
            equals: value
          }
        };
      case 'contains':
        return {
          [field]: {
            contains: value,
            mode: 'insensitive'
          }
        };
      case 'startsWith':
        return {
          [field]: {
            startsWith: value,
            mode: 'insensitive'
          }
        };
      case 'endsWith':
        return {
          [field]: {
            endsWith: value,
            mode: 'insensitive'
          }
        };
      // Add more operators as needed
      default:
        return {};
    }
  }).filter(condition => Object.keys(condition).length > 0);

  // Combine conditions based on logical operator
  if (conditions.length > 0) {
    if (filterState.logicalOperator === 'OR') {
      return {
        ...baseWhere,
        OR: conditions
      };
    } else {
      return {
        ...baseWhere,
        AND: conditions
      };
    }
  }

  return baseWhere;
}

/**
 * Builds a combined Prisma where object that includes filter state, search term, and organizationId
 * Use this when you need to combine complex filters with search functionality
 */
export function buildCombinedWhereClause(
  organizationId: string,
  filterState?: FilterState | null,
  searchTerm?: string | null
): Prisma.ContactsWhereInput {
  // Start with the base filter from filterState
  const baseWhere = buildPrismaWhereFromFilters(filterState, organizationId);
  
  // If no search term, just return the base where clause
  if (!searchTerm || searchTerm.trim() === '') {
    return baseWhere;
  }
  
  // Add search conditions
  const trimmedSearch = searchTerm.trim();
  const searchCondition: Prisma.ContactsWhereInput = {
    OR: [
      { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
      { lastName: { contains: trimmedSearch, mode: 'insensitive' } },
      { email: { contains: trimmedSearch, mode: 'insensitive' } },
      { leadStatus: { contains: trimmedSearch, mode: 'insensitive' } },
      { title: { contains: trimmedSearch, mode: 'insensitive' } },
      { currentCompanyName: { contains: trimmedSearch, mode: 'insensitive' } }
    ]
  };
  
  // Combine base filters and search conditions (ensuring organizationId is always applied)
  // If baseWhere has AND conditions, add search to it
  if (baseWhere.AND) {
    return {
      ...baseWhere,
      AND: Array.isArray(baseWhere.AND) 
        ? [...baseWhere.AND, searchCondition] 
        : [baseWhere.AND, searchCondition]
    };
  }
  
  // If baseWhere has OR conditions, wrap everything in an AND
  if (baseWhere.OR) {
    return {
      organizationId,
      AND: [
        { OR: baseWhere.OR },
        searchCondition
      ]
    };
  }
  
  // Otherwise, just add search under AND
  return {
    ...baseWhere,
    AND: [searchCondition]
  };
}

/**
 * Creates a standard API response object
 */
export function createApiResponse<T>(
  success: boolean, 
  data?: T,
  error?: string,
  status: number = success ? 200 : 400
) {
  const response: { 
    success: boolean; 
    data?: T; 
    error?: string;
  } = { success };
  
  if (data !== undefined) {
    response.data = data;
  }
  
  if (error) {
    response.error = error;
  }
  
  return { response, status };
}
