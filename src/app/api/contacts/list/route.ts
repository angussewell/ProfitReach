import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { FilterState } from '@/types/filters';
import { buildSqlWhereFromFilters } from '@/lib/filter-utils';

// Constants - Fallback for testing purposes
const PLACEHOLDER_ORG_ID = 'org_test_alpha';

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
