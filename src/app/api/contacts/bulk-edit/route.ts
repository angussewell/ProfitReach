import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { FilterState } from '@/types/filters';
import { buildCombinedWhereClause, createApiResponse } from '@/lib/filters';

// Constants
const PLACEHOLDER_ORG_ID = 'org_test_alpha'; // Fallback for testing
const MAX_BULK_LIMIT = 1000; // Maximum number of contacts to edit at once

// Valid lead status values
const VALID_LEAD_STATUSES = [
  'New',
  'Contacted',
  'Qualified', 
  'Unqualified',
  'Replied',
  'Customer',
  'Churned'
];

// Type for the bulk edit request
type BulkEditRequest = {
  contactIds?: string[];
  isSelectAllMatchingActive?: boolean;
  filterState?: FilterState | null;
  searchTerm?: string;
  fieldToUpdate: string;
  newValue: any;
};

// Valid fields for bulk editing
const VALID_FIELDS = [
  'title',
  'currentCompanyName',
  'leadStatus',
  'lastActivityAt',
  'country',
  'state',
  'city',
  'tags'
];

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
    
    const { 
      contactIds, 
      isSelectAllMatchingActive, 
      filterState, 
      searchTerm, 
      fieldToUpdate, 
      newValue 
    } = body as BulkEditRequest;
    
    // Determine if we're in "select all matching" mode
    const isSelectAllMode = isSelectAllMatchingActive === true;
    
    // Validate input based on mode
    if (!isSelectAllMode && (!Array.isArray(contactIds) || contactIds.length === 0)) {
      return NextResponse.json(
        { message: 'Contact IDs array is required and must not be empty when not in "Select All Matching" mode' },
        { status: 400 }
      );
    }
    
    // Validate fieldToUpdate
    if (!fieldToUpdate || !VALID_FIELDS.includes(fieldToUpdate)) {
      return NextResponse.json(
        { message: 'Invalid field to update', validFields: VALID_FIELDS },
        { status: 400 }
      );
    }
    
    // Validate field-specific values
    if (fieldToUpdate === 'leadStatus' && !VALID_LEAD_STATUSES.includes(newValue)) {
      return NextResponse.json(
        { 
          message: 'Invalid lead status', 
          validOptions: VALID_LEAD_STATUSES 
        },
        { status: 400 }
      );
    }
    
    // Get organization ID from session
    const session = await getServerSession(authOptions);
    const organizationId = session?.user?.organizationId || PLACEHOLDER_ORG_ID;
    
    console.log(`Using organization ID for bulk contact editing: ${organizationId}`);
    
    try {
      // Log operation details
      if (isSelectAllMode) {
        console.log(`Received request to edit all contacts matching filters`);
        console.log(`Filter state: ${JSON.stringify(filterState)}`);
        console.log(`Search term: ${searchTerm}`);
      } else {
        console.log(`Received request to edit contacts: ${JSON.stringify(contactIds)}`);
      }
      console.log(`Field to update: ${fieldToUpdate}`);
      console.log(`New value: ${typeof newValue === 'object' ? JSON.stringify(newValue) : newValue}`);
      
      // Start transaction to ensure all operations succeed or fail together
      const result = await prisma.$transaction(async (tx) => {
        let validContactIds: string[] = [];
        
        if (isSelectAllMode) {
          // For "Select All Matching" mode, first query for all matching contact IDs
          // Build the where clause with the filter state
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
          
          console.log(`Found ${validContactIds.length} matching contacts for editing.`);
          
          if (validContactIds.length === 0) {
            throw new Error('No matching contacts found for editing');
          }
        } else {
          // Standard mode - find existing contacts that belong to this organization
          const existingContacts = await tx.contacts.findMany({
            where: {
              id: { in: contactIds },
              organizationId,
            },
            select: { id: true }
          });
          
          validContactIds = existingContacts.map(contact => contact.id);
          
          // Check if any requested contacts don't exist or don't belong to this org
          if (validContactIds.length === 0) {
            throw new Error('No valid contacts found for update');
          }
        }
        
        // Calculate invalid contacts for non-selectAll mode
        const invalidCount = isSelectAllMode ? 0 : contactIds!.length - validContactIds.length;
        
        // Process updates based on field type
        if (fieldToUpdate === 'tags') {
          if (!Array.isArray(newValue)) {
            throw new Error('Tags value must be an array');
          }
          
          // Filter out empty tag names
          const validTagNames = newValue
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
          
          if (validTagNames.length === 0) {
            // If no valid tags, just delete existing tags for all contacts
            await tx.$executeRaw`
              DELETE FROM "ContactTags"
              WHERE "contactId" = ANY(${validContactIds}::text[])
            `;
          } else {
            // First get or create all necessary tags in a single batch
            // This approach reduces the number of database operations
            
            // 1. Find all existing tags matching the given names
            const existingTags = await tx.$queryRaw<{id: string, name: string}[]>`
              SELECT id, name 
              FROM "Tags" 
              WHERE "organizationId" = ${organizationId} 
              AND name = ANY(${validTagNames}::text[])
            `;
            
            // Get a map of existing tag names to their IDs for quick lookup
            const existingTagMap = new Map(
              existingTags.map(tag => [tag.name, tag.id])
            );
            
            // 2. Create any tags that don't exist yet
            const tagsToCreate = validTagNames.filter(name => !existingTagMap.has(name));
            
            if (tagsToCreate.length > 0) {
              // Prepare values for a batch insert of multiple tags
              const tagInsertValues = tagsToCreate
                .map(tagName => `(gen_random_uuid(), ${organizationId}, '${tagName.replace(/'/g, "''")}', NOW(), NOW())`)
                .join(', ');
              
              // Execute batch insert for new tags
              await tx.$executeRaw`
                INSERT INTO "Tags" (id, "organizationId", name, "createdAt", "updatedAt")
                VALUES ${Prisma.raw(tagInsertValues)}
                ON CONFLICT ("organizationId", name) DO NOTHING
              `;
              
              // Fetch the newly created tags to get their IDs
              const newTags = await tx.$queryRaw<{id: string, name: string}[]>`
                SELECT id, name 
                FROM "Tags" 
                WHERE "organizationId" = ${organizationId} 
                AND name = ANY(${tagsToCreate}::text[])
              `;
              
              // Add these to the existing tag map
              newTags.forEach(tag => existingTagMap.set(tag.name, tag.id));
            }
            
            // Now we have IDs for all the tags we need in existingTagMap
            
            // 3. Delete all existing ContactTags for the affected contacts
            await tx.$executeRaw`
              DELETE FROM "ContactTags"
              WHERE "contactId" = ANY(${validContactIds}::text[])
            `;
            
            // 4. Create all new ContactTags relationships in a batch
            if (existingTagMap.size > 0) {
              const tagIds = Array.from(existingTagMap.values());
              
              // Create multiple contactTag entries for each contactId and tagId combination
              // This is much more efficient than individual inserts
              let contactTagInsertValues = [];
              
              for (const contactId of validContactIds) {
                for (const tagId of tagIds) {
                  contactTagInsertValues.push(`('${contactId}', '${tagId}', NOW())`);
                }
              }
              
              // Insert all contact-tag relationships in a single transaction
              await tx.$executeRaw`
                INSERT INTO "ContactTags" ("contactId", "tagId", "createdAt")
                VALUES ${Prisma.raw(contactTagInsertValues.join(', '))}
                ON CONFLICT ("contactId", "tagId") DO NOTHING
              `;
            }
          }
        } else if (fieldToUpdate === 'lastActivityAt') {
          // Handle date field
          await tx.$executeRaw`
            UPDATE "Contacts"
            SET "lastActivityAt" = ${newValue}::timestamptz,
                "updatedAt" = NOW()
            WHERE id = ANY(${validContactIds}::text[])
            AND "organizationId" = ${organizationId}
          `;
        } else if (fieldToUpdate === 'leadStatus') {
          // Update both leadStatus and additionalData.status for compatibility
          await tx.$executeRaw`
            UPDATE "Contacts"
            SET "leadStatus" = ${newValue},
                "additionalData" = jsonb_set(
                  COALESCE("additionalData", '{}'),
                  '{status}',
                  ${JSON.stringify(newValue)}::jsonb
                ),
                "updatedAt" = NOW()
            WHERE id = ANY(${validContactIds}::text[])
            AND "organizationId" = ${organizationId}
          `;
        } else {
          // Use a switch statement with hardcoded column names for safety
          // This prevents SQL injection by avoiding dynamic field names
          switch (fieldToUpdate) {
            case 'title':
              await tx.$executeRaw`
                UPDATE "Contacts"
                SET "title" = ${newValue},
                    "updatedAt" = NOW()
                WHERE id = ANY(${validContactIds}::text[])
                AND "organizationId" = ${organizationId}
              `;
              break;
            case 'currentCompanyName':
              await tx.$executeRaw`
                UPDATE "Contacts"
                SET "currentCompanyName" = ${newValue},
                    "updatedAt" = NOW()
                WHERE id = ANY(${validContactIds}::text[])
                AND "organizationId" = ${organizationId}
              `;
              break;
            case 'country':
              await tx.$executeRaw`
                UPDATE "Contacts"
                SET "country" = ${newValue},
                    "updatedAt" = NOW()
                WHERE id = ANY(${validContactIds}::text[])
                AND "organizationId" = ${organizationId}
              `;
              break;
            case 'state':
              await tx.$executeRaw`
                UPDATE "Contacts"
                SET "state" = ${newValue},
                    "updatedAt" = NOW()
                WHERE id = ANY(${validContactIds}::text[])
                AND "organizationId" = ${organizationId}
              `;
              break;
            case 'city':
              await tx.$executeRaw`
                UPDATE "Contacts"
                SET "city" = ${newValue},
                    "updatedAt" = NOW()
                WHERE id = ANY(${validContactIds}::text[])
                AND "organizationId" = ${organizationId}
              `;
              break;
            default:
              throw new Error(`Update for field '${fieldToUpdate}' not implemented`);
          }
        }
        
        return {
          updatedCount: validContactIds.length,
          invalidCount
        };
      });
      
      return NextResponse.json(
        { 
          message: `${result.updatedCount} contacts updated successfully`,
          updatedCount: result.updatedCount,
          invalidCount: result.invalidCount
        },
        { status: 200 }
      );
      
    } catch (dbError) {
      console.error('Database error during bulk update:', dbError);
      
      // Check for foreign key constraint errors
      if (dbError instanceof Error && dbError.message.includes('foreign key constraint')) {
        return NextResponse.json(
          { message: 'Referenced entity does not exist' },
          { status: 400 }
        );
      }
      
      // Other database errors
      return NextResponse.json(
        { 
          message: 'Database error while updating contacts',
          details: dbError instanceof Error ? dbError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in bulk contact update API:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
