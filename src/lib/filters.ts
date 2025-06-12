import { FilterCondition, FilterState } from '@/types/filters';
import { Prisma } from '@prisma/client';

// Helper function to safely parse a date string (YYYY-MM-DD) into a Date object (start of day UTC)
// Returns null if parsing fails
function parseDateUTC(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    console.warn(`[parseDateUTC] Invalid date string format received: ${dateString}`);
    return null;
  }
  try {
    // Extract year, month (0-indexed), day
    const [year, month, day] = dateString.split('-').map(Number);
    // Create Date object using UTC values
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    // Double-check if the constructed date is valid (handles invalid dates like 2023-02-30)
    if (isNaN(dateObj.getTime())) {
        console.warn(`[parseDateUTC] Constructed invalid date from: ${dateString}`);
        return null;
    }
    return dateObj;
  } catch (e) {
    console.error(`[parseDateUTC] Error parsing date string "${dateString}":`, e);
    return null;
  }
}


/**
 * Builds a Prisma where object from a FilterState and organizationId.
 * Handles standard field filters (including specific logic for DateTime fields).
 * Tag relationship filters are handled separately in the API route.
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

  // Define standard filterable fields (excluding relations handled separately)
  const standardFields = [
    'firstName', 'lastName', 'email', 'title', 'currentCompanyName',
    'leadStatus', 'city', 'state', 'country', 'previousMessageCopy' // Added previousMessageCopy
    // DateTime fields handled separately below
    // Add other non-DateTime direct fields from Contacts model as needed
  ];
  const dateTimeFields = ['createdAt', 'updatedAt', 'lastActivityAt'];

  // Build conditions based on the filter state
  const conditions = filterState.conditions.map((condition: FilterCondition) => {
    const { field, operator, value } = condition;
    let prismaCondition: Prisma.ContactsWhereInput = {};

    // --- Handle DateTime Field Filters ---
    if (dateTimeFields.includes(field)) {
      switch (operator) {
        case 'equals': { // "Is On" specific date
          const date = parseDateUTC(value as string);
          if (date) {
            const startOfDay = date; // Already start of day UTC
            const startOfNextDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
            prismaCondition = { [field]: { gte: startOfDay, lt: startOfNextDay } };
          } else {
             console.warn(`[DateTime Filter] Invalid date value for 'equals' operator: ${value}`);
          }
          break;
        }
        case 'isAfter': {
          const date = parseDateUTC(value as string);
          if (date) {
             // To be strictly *after* the given day, compare with the start of the *next* day
             const startOfNextDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
             prismaCondition = { [field]: { gte: startOfNextDay } }; // Use gte for "on or after the next day"
             // If 'isAfter' means any time after 00:00:00 on the specified day, use:
             // prismaCondition = { [field]: { gt: date } };
          } else {
             console.warn(`[DateTime Filter] Invalid date value for 'isAfter' operator: ${value}`);
          }
          break;
        }
        case 'isBefore': {
          const date = parseDateUTC(value as string);
          if (date) {
             // To be strictly *before* the given day, compare with the start of that day
             prismaCondition = { [field]: { lt: date } };
          } else {
             console.warn(`[DateTime Filter] Invalid date value for 'isBefore' operator: ${value}`);
          }
          break;
        }
        case 'between': {
          if (Array.isArray(value) && value.length === 2) {
            const startDate = parseDateUTC(value[0] as string);
            const endDate = parseDateUTC(value[1] as string);
            if (startDate && endDate) {
               // Inclusive start date, inclusive end date (adjust if needed)
               // To make end date inclusive, check up to the start of the *day after* the end date
               const endOfDayExclusive = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate() + 1));
               prismaCondition = { [field]: { gte: startDate, lt: endOfDayExclusive } };
            } else {
               console.warn(`[DateTime Filter] Invalid date values for 'between' operator: ${value}`);
            }
          } else {
             console.warn(`[DateTime Filter] Invalid value format for 'between' operator (expected array of 2 strings): ${value}`);
          }
          break;
        }
        case 'isEmpty': // Correct handling for DateTime
          prismaCondition = { [field]: null };
          break;
        case 'isNotEmpty': // Correct handling for DateTime
          prismaCondition = { [field]: { not: null } };
          break;
        default:
          console.warn(`[buildPrismaWhereFromFilters] Unsupported operator "${operator}" for DateTime field "${field}"`);
      }
    }
    // --- Handle Standard (non-DateTime) Field Filters ---
    else if (standardFields.includes(field)) {
      switch (operator) {
        case 'equals':
          prismaCondition = { [field]: { equals: value } };
          break;
        case 'notEquals':
          prismaCondition = { [field]: { not: value } };
          break;
        case 'contains':
          // Ensure value is a string for contains
          if (typeof value === 'string') {
            prismaCondition = { [field]: { contains: value, mode: 'insensitive' } };
          } else {
             console.warn(`[Standard Filter] Invalid value type for 'contains' operator (expected string): ${value}`);
          }
          break;
        case 'notContains':
           // Ensure value is a string for notContains
           if (typeof value === 'string') {
             prismaCondition = { [field]: { not: { contains: value, mode: 'insensitive' } } };
           } else {
              console.warn(`[Standard Filter] Invalid value type for 'notContains' operator (expected string): ${value}`);
           }
          break;
        case 'startsWith':
           // Ensure value is a string for startsWith
           if (typeof value === 'string') {
             prismaCondition = { [field]: { startsWith: value, mode: 'insensitive' } };
           } else {
              console.warn(`[Standard Filter] Invalid value type for 'startsWith' operator (expected string): ${value}`);
           }
          break;
        case 'endsWith':
           // Ensure value is a string for endsWith
           if (typeof value === 'string') {
             prismaCondition = { [field]: { endsWith: value, mode: 'insensitive' } };
           } else {
              console.warn(`[Standard Filter] Invalid value type for 'endsWith' operator (expected string): ${value}`);
           }
          break;
        case 'isEmpty': // Standard handling for non-DateTime
          // Checks for EITHER null OR empty string
          prismaCondition = { OR: [ { [field]: null }, { [field]: '' } ] };
          break;
        case 'isNotEmpty': // Standard handling for non-DateTime
          // Checks for BOTH not null AND not empty string
          prismaCondition = { AND: [ { [field]: { not: null } }, { [field]: { not: '' } } ] };
          break;
        // Add more standard operators as needed
        default:
          console.warn(`[buildPrismaWhereFromFilters] Unsupported operator "${operator}" for standard field "${field}"`);
          break; // Skip unsupported standard operators
      }
    }
    // If field is not in dateTimeFields or standardFields (e.g., 'tags' which is handled in API route, or unknown field)
    else if (field !== 'tags') { // Avoid warning for 'tags' field
      console.warn(`[buildPrismaWhereFromFilters] Field "${field}" is not configured for filtering.`);
      // Skip condition if field isn't recognized
    }

    return prismaCondition;

  }).filter(condition => Object.keys(condition).length > 0); // Filter out empty conditions

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
