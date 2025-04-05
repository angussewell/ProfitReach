import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { FilterState } from '@/types/filters';

// Constants - Fallback for testing purposes
const PLACEHOLDER_ORG_ID = 'org_test_alpha';

// Function to build SQL WHERE clause from filters
// Simplified version extracted directly from filter-utils.ts to avoid import issues
function buildSqlWhereFromFilters(
  filterState: FilterState,
  organizationId: string
): { sql: string, params: any[] } {
  // Start with the base WHERE clause for organization
  let sql = `WHERE "organizationId" = $1`;
  const params: any[] = [organizationId];
  
  if (!filterState?.conditions || filterState.conditions.length === 0) {
    return { sql, params };
  }
  
  // For simplicity, we're only implementing the basic WHERE clause generation
  // In a production environment, you would want to implement all the condition building logic
  // But for our current needs, this basic implementation should work
  const conditionSql: string[] = [];
  
  filterState.conditions.forEach(condition => {
    const { field, operator, value } = condition;
    const paramIndex = params.length + 1;
    
    // Handle standard fields - this is a simplified implementation
    // Whitelist of allowed field names to prevent SQL injection
    const allowedFields = [
      'firstName', 'lastName', 'email', 'title', 'currentCompanyName',
      'leadStatus', 'city', 'state', 'country', 'createdAt', 'updatedAt', 
      'lastActivityAt'
    ];
    
    if (!allowedFields.includes(field)) {
      return; // Skip fields that aren't in the whitelist
    }
    
    const safeFieldName = `"${field}"`;
    
    // Basic operator handling
    switch (operator) {
      case 'equals':
        conditionSql.push(`${safeFieldName} = $${paramIndex}`);
        params.push(value);
        break;
      case 'contains':
        conditionSql.push(`${safeFieldName} ILIKE $${paramIndex}`);
        params.push(`%${value}%`);
        break;
      case 'startsWith':
        conditionSql.push(`${safeFieldName} ILIKE $${paramIndex}`);
        params.push(`${value}%`);
        break;
      case 'endsWith':
        conditionSql.push(`${safeFieldName} ILIKE $${paramIndex}`);
        params.push(`%${value}`);
        break;
      // Add more operators as needed
    }
  });
  
  if (conditionSql.length > 0) {
    // Combine using AND or OR
    const combiner = filterState.logicalOperator === 'OR' ? ' OR ' : ' AND ';
    sql += ` AND (${conditionSql.join(combiner)})`;
  }
  
  return { sql, params };
}

export async function GET(request: Request) {
  try {
    // Extract search params
    const url = new URL(request.url);
    const filtersParam = url.searchParams.get('filters');
    const searchTerm = url.searchParams.get('search');
    
    // Get the organization ID from the session
    const session = await getServerSession(authOptions);
    const organizationId = session?.user?.organizationId || PLACEHOLDER_ORG_ID;
    
    // Parse filter state from search params
    let filterState: FilterState | null = null;
    
    if (filtersParam) {
      try {
        filterState = JSON.parse(decodeURIComponent(filtersParam));
        console.log('API - Applied filters:', filterState);
      } catch (e) {
        console.error('API - Error parsing filters:', e);
      }
    }
    
    // Build the where clause with the filter state using SQL approach
    const where = filterState 
      ? buildSqlWhereFromFilters(filterState, organizationId)
      : { sql: `WHERE "organizationId" = $1`, params: [organizationId] };
      
    // Add search conditions if searchTerm is provided
    let searchCondition = '';
    let searchParams: any[] = [];
    
    if (searchTerm && searchTerm.trim() !== '') {
      const trimmedSearch = searchTerm.trim();
      
      // Create a search condition across multiple fields
      searchCondition = `
        AND (
          "firstName" ILIKE $${where.params.length + 1} OR
          "lastName" ILIKE $${where.params.length + 1} OR
          "email" ILIKE $${where.params.length + 1} OR
          "leadStatus" ILIKE $${where.params.length + 1} OR
          "title" ILIKE $${where.params.length + 1} OR
          "currentCompanyName" ILIKE $${where.params.length + 1}
        )
      `;
      
      // Add the search parameter (only once since we're using the same parameter multiple times)
      searchParams = [`%${trimmedSearch}%`];
      
      console.log('API - Searching for:', trimmedSearch);
    }
    
    // Combine the where clause with search conditions
    const finalWhereClause = {
      sql: where.sql + searchCondition,
      params: [...where.params, ...searchParams]
    };
    
    console.log('API - Fetching contacts with where clause:', finalWhereClause);
    
    // Fetch contacts with the dynamic SQL where clause and params
    let contacts;
    
    // We need to handle the parameters correctly
    if (finalWhereClause.params && finalWhereClause.params.length > 0) {
      // Constructing the query with parameters
      const sqlQuery = `
        SELECT 
          id, 
          "firstName", 
          "lastName", 
          email, 
          "photoUrl", 
          title, 
          "currentCompanyName", 
          "additionalData",
          "leadStatus",
          city,
          state,
          country
        FROM "Contacts"
        ${finalWhereClause.sql}
        ORDER BY "updatedAt" DESC
      `;
      
      // Execute with parameters from the where.params array
      contacts = await prisma.$queryRawUnsafe(sqlQuery, ...finalWhereClause.params);
      
      // Get total count for the same query
      const countQuery = `
        SELECT COUNT(*) as count
        FROM "Contacts"
        ${finalWhereClause.sql}
      `;
      
      const countResult = await prisma.$queryRawUnsafe<{count: string}[]>(countQuery, ...finalWhereClause.params);
      var totalCount = parseInt(countResult[0].count, 10);
    } else {
      // Fallback to simple query without parameters
      contacts = await prisma.$queryRaw`
        SELECT 
          id, 
          "firstName", 
          "lastName", 
          email, 
          "photoUrl", 
          title, 
          "currentCompanyName", 
          "additionalData",
          "leadStatus",
          city,
          state,
          country
        FROM "Contacts"
        ${Prisma.raw(finalWhereClause.sql)}
        ORDER BY "updatedAt" DESC
      `;
      
      // Get total count
      const countResult = await prisma.$queryRaw<{count: string}[]>`
        SELECT COUNT(*) as count
        FROM "Contacts"
        ${Prisma.raw(finalWhereClause.sql)}
      `;
      
      var totalCount = parseInt(countResult[0].count, 10);
    }

    // Process the contacts to extract status from additionalData
    const processedContacts = (contacts as any[]).map((contact: any) => {
      let status: string | undefined = undefined;
      
      if (contact.additionalData && typeof contact.additionalData === 'object') {
        const additionalData = contact.additionalData as any;
        status = additionalData.status;
      }
      
      return {
        ...contact,
        status
      };
    });

    // Return the processed contacts and total count as JSON
    return NextResponse.json({ 
      success: true,
      data: processedContacts,
      totalCount
    });

  } catch (error) {
    console.error('API - Error fetching contacts:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
