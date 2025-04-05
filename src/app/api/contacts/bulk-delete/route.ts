import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { FilterState } from '@/types/filters';

// Constants
// Use the provided Neon DB connection
const PLACEHOLDER_ORG_ID = 'org_test_alpha'; // Fallback for testing
// Actual DB connection handled by Prisma

// Expected request body type
type BulkDeleteRequest = {
  contactIds?: string[];
  isSelectAllMatchingActive?: boolean;
  filterState?: FilterState | null;
  searchTerm?: string;
  force?: boolean; // Optional parameter to force delete (will delete related workflow states)
};

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

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    
    // Basic validation
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { contactIds, isSelectAllMatchingActive, filterState, searchTerm, force = false } = body as BulkDeleteRequest;
    
    // Validate input based on mode
    const isSelectAllMode = isSelectAllMatchingActive === true;
    
    if (!isSelectAllMode && (!Array.isArray(contactIds) || contactIds.length === 0)) {
      return NextResponse.json(
        { message: 'Contact IDs array is required and must not be empty when not in "Select All Matching" mode' },
        { status: 400 }
      );
    }
    
    // Get organization ID from session
    const session = await getServerSession(authOptions);
    const organizationId = session?.user?.organizationId || PLACEHOLDER_ORG_ID;
    
    console.log(`Using organization ID for bulk contact deletion: ${organizationId}`);
    
    try {
      // Log detailed information for debugging
      if (isSelectAllMode) {
        console.log(`Received request to delete all contacts matching filters`);
        console.log(`Filter state: ${JSON.stringify(filterState)}`);
        console.log(`Search term: ${searchTerm}`);
      } else {
        console.log(`Received request to delete contacts: ${JSON.stringify(contactIds)}`);
      }
      console.log(`Organization ID: ${organizationId}`);
      
      // Find valid contacts within a transaction
      const result = await prisma.$transaction(async (tx) => {
        let validContactIds: string[] = [];
        
        if (isSelectAllMode) {
          // For "Select All Matching" mode, first query for all matching contact IDs
          // Build the where clause with the filter state using same logic as in list endpoint
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
            
            // Add the search parameter
            searchParams = [`%${trimmedSearch}%`];
          }
          
          // Combine the where clause with search conditions
          const finalWhereClause = {
            sql: where.sql + searchCondition,
            params: [...where.params, ...searchParams]
          };
          
          // Query for IDs only
          const idQuery = `
            SELECT id
            FROM "Contacts"
            ${finalWhereClause.sql}
          `;
          
          const matchingContacts = await tx.$queryRawUnsafe<{id: string}[]>(idQuery, ...finalWhereClause.params);
          validContactIds = matchingContacts.map(c => c.id);
          
          console.log(`Found ${validContactIds.length} matching contacts for deletion.`);
          
          if (validContactIds.length === 0) {
            throw new Error('No matching contacts found for deletion');
          }
        } else {
          // Standard mode - find existing contacts that belong to this organization
          const existingContacts = await tx.contacts.findMany({
            where: {
              id: { in: contactIds },
              organizationId,
            },
            // Include related records to check constraints
            include: {
              ContactWorkflowState: true
            }
          });
          
          validContactIds = existingContacts.map(contact => contact.id);
          
          // Check for workflow states in the standard mode
          const contactsWithWorkflows = existingContacts.filter(
            contact => contact.ContactWorkflowState && contact.ContactWorkflowState.length > 0
          );
          
          if (contactsWithWorkflows.length > 0) {
            console.log(`${contactsWithWorkflows.length} contacts have related workflow states`);
            
            if (force) {
              // Force delete mode - delete workflow states first
              console.log(`Force mode: Deleting related workflow states first`);
              
              // Collect all workflow state IDs that need to be deleted
              const workflowStateIds = contactsWithWorkflows.flatMap(
                contact => contact.ContactWorkflowState.map(state => state.stateId)
              );
              
              // Log the workflow states being deleted
              console.log(`Deleting ${workflowStateIds.length} workflow states: ${workflowStateIds.join(', ')}`);
              
              // Delete the workflow states
              const deleteWorkflowResult = await tx.contactWorkflowState.deleteMany({
                where: {
                  stateId: { in: workflowStateIds }
                }
              });
              
              console.log(`Deleted ${deleteWorkflowResult.count} workflow states`);
            } else {
              // Standard mode - return error for contacts with workflows
              throw new Error(`Cannot delete contacts with active workflows: ${contactsWithWorkflows.map(c => c.id).join(', ')}`);
            }
          }
        }
      
        // Check if any contacts don't exist or don't belong to this org
        if (validContactIds.length === 0) {
          throw new Error('No valid contacts found for deletion');
        }
        
        // Calculate invalid contacts for non-selectAll mode
        const invalidCount = isSelectAllMode ? 0 : contactIds!.length - validContactIds.length;
      
        // Log before attempting delete
        console.log(`Attempting to delete ${validContactIds.length} contacts with IDs: ${validContactIds.join(', ')}`);
        
        // Use a simpler approach with Prisma's native API
        // This uses proper typing and parameter binding
        const deleteResult = await tx.contacts.deleteMany({
          where: {
            id: { in: validContactIds },
            organizationId
          }
        });
        
        console.log(`Delete result: ${JSON.stringify(deleteResult)}`);
        
        return {
          deletedCount: deleteResult.count,
          invalidCount
        };
      });
      
      return NextResponse.json(
        { 
          message: `${result.deletedCount} contacts deleted successfully`,
          deletedCount: result.deletedCount,
          invalidCount: result.invalidCount
        },
        { status: 200 }
      );
      
    } catch (error) {
      // Enhanced error handling with detailed logging
      console.error('Error in bulk contact deletion:', error);
      
      // Determine error type for better client response
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle known Prisma errors
        if (error.code === 'P2003') {
          // Foreign key constraint failure
          return NextResponse.json(
            { message: 'Cannot delete contacts due to existing relationships with other records' },
            { status: 400 }
          );
        } else if (error.code === 'P2025') {
          // Record not found
          return NextResponse.json(
            { message: 'Some or all contacts could not be found' },
            { status: 404 }
          );
        }
      }
      
      // For errors related to workflow states that we identified
      if (error instanceof Error && error.message.includes('Cannot delete contacts with active workflows')) {
        return NextResponse.json(
          { message: error.message },
          { status: 400 }
        );
      }
      
      // For all other errors
      return NextResponse.json(
        { 
          message: 'Database error while deleting contacts',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // General request handling errors
    console.error('Error processing bulk delete request:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
