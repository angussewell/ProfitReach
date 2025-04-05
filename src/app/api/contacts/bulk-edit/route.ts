import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { FilterState } from '@/types/filters';
import { buildSqlWhereFromFilters } from '../../../../lib/filter-utils';

// Constants
const PLACEHOLDER_ORG_ID = 'org_test_alpha'; // Fallback for testing

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
          
          // Process each contact's tags
          for (const contactId of validContactIds) {
            // 1. Delete existing tags for this contact
            await tx.$executeRaw`
              DELETE FROM "ContactTags"
              WHERE "contactId" = ${contactId}
            `;
            
            // 2. Process each tag
            for (const tagName of newValue) {
              if (!tagName.trim()) continue; // Skip empty tags
              
              // Try to find the tag first
              const existingTags = await tx.$queryRaw`
                SELECT id FROM "Tags" 
                WHERE "organizationId" = ${organizationId} 
                AND name = ${tagName}
                LIMIT 1
              `;
              
              let tagId: string;
              
              if (Array.isArray(existingTags) && existingTags.length > 0) {
                // Tag exists, use its ID
                tagId = existingTags[0].id;
              } else {
                // Tag doesn't exist, create it
                await tx.$executeRaw`
                  INSERT INTO "Tags" (id, "organizationId", name, "createdAt", "updatedAt")
                  VALUES (gen_random_uuid(), ${organizationId}, ${tagName}, NOW(), NOW())
                  ON CONFLICT ("organizationId", name) DO NOTHING
                `;
                
                // Fetch the newly created tag's ID
                const newTags = await tx.$queryRaw`
                  SELECT id FROM "Tags" 
                  WHERE "organizationId" = ${organizationId} 
                  AND name = ${tagName}
                  LIMIT 1
                `;
                
                if (Array.isArray(newTags) && newTags.length > 0) {
                  tagId = newTags[0].id;
                } else {
                  console.error(`Failed to create or find tag: ${tagName}`);
                  continue; // Skip this tag
                }
              }
              
              // Create the contact-tag relationship
              await tx.$executeRaw`
                INSERT INTO "ContactTags" ("contactId", "tagId", "createdAt")
                VALUES (${contactId}, ${tagId}, NOW())
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
          // Standard field update - use Prisma.sql`` for safety
          await tx.$executeRaw`
            UPDATE "Contacts"
            SET "${Prisma.raw(fieldToUpdate)}" = ${newValue},
                "updatedAt" = NOW()
            WHERE id = ANY(${validContactIds}::text[])
            AND "organizationId" = ${organizationId}
          `;
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
