'use server';

import { prisma } from './prisma';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client'; // Import Prisma for types
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { FilterState } from '@/types/filters'; // Assuming FilterState type is defined here
import { buildCombinedWhereClause } from '@/lib/filters'; // Corrected import

// Example server action for getting a user
export async function getUser(id: string) {
  return await prisma.account.findUnique({
    where: { id }
  })
}

// Example server action for creating a user
export async function createUser(data: any) {
  return await prisma.account.create({
    data
  })
}

// Example server action for updating a user
export async function updateUser(id: string, data: any) {
  return await prisma.account.update({
    where: { id },
    data
  })
}

// Server action to update conversation status
export async function updateMessageStatus(threadId: string, status: string) {
  try {
    // Verify the thread exists using raw SQL
    const messages: { id: string }[] = await prisma.$queryRaw(
      Prisma.sql`SELECT id FROM "EmailMessage" WHERE "threadId" = ${threadId} LIMIT 1`
    );

    if (messages.length === 0) {
      return {
        success: false,
        error: 'Thread not found' 
      }
    }

    // Update the status for ALL messages in this thread
    await prisma.$executeRaw`
      UPDATE "EmailMessage"
      SET "status" = ${status}::public."ConversationStatus"
      WHERE "threadId" = ${threadId}
    `

    revalidatePath('/universal-inbox')

    return { 
      success: true,
      threadId,
      status 
    }
  } catch (error) {
    console.error('Error updating message status:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Server action for Admins to purge stale ContactWorkflowState records.
 * Deletes all records globally where status is 'waiting_scenario'.
 */
export async function purgeStaleWorkflowStates(): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
  'use server'; // Ensure this runs on the server

  try {
    // 1. Get user session and validate role
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin role required.' };
    }

    // 2. Perform the deletion
    console.log("Admin action: Purging ContactWorkflowState records with status 'waiting_scenario'...");
    const deleteResult = await prisma.contactWorkflowState.deleteMany({
      where: {
        status: 'waiting_scenario',
      },
    });

    console.log(`Purged ${deleteResult.count} stale workflow states.`);

    // 3. Optionally revalidate paths if this impacts any cached views (unlikely for admin cleanup)
    // revalidatePath('/some-relevant-path'); 

    return { success: true, deletedCount: deleteResult.count };

  } catch (error) {
    console.error('Error in purgeStaleWorkflowStates server action:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: `Failed to purge stale workflow states: ${message}` };
  }
}

/**
 * Server action for Admins to reactivate stale ContactWorkflowState records.
 * Updates records globally where status is 'waiting_scenario' to 'active'.
 */
export async function reactivateStaleWorkflowStates(): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
  'use server'; // Ensure this runs on the server

  try {
    // 1. Get user session and validate role
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin role required.' };
    }

    // 2. Perform the update
    console.log("Admin action: Reactivating ContactWorkflowState records with status 'waiting_scenario' to 'active'...");
    const updateResult = await prisma.contactWorkflowState.updateMany({
      where: {
        status: 'waiting_scenario',
      },
      data: {
        status: 'active', // Set the new status
        // Optionally update lastProcessedAt or add a note? For now, just status.
        // lastProcessedAt: new Date(), 
      },
    });

    console.log(`Reactivated ${updateResult.count} stale workflow states.`);

    // 3. Optionally revalidate paths if this impacts any cached views
    // revalidatePath('/some-relevant-path'); 

    return { success: true, updatedCount: updateResult.count };

  } catch (error) {
    console.error('Error in reactivateStaleWorkflowStates server action:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: `Failed to reactivate stale workflow states: ${message}` };
  }
}


/**
 * Server action to bulk update the organizationId for selected contacts.
 * Handles both specific contact IDs and "select all matching" scenarios.
 * Enforces permissions based on user role.
 */
export async function bulkSendContactsToOrg(params: {
  contactIds?: string[];
  targetOrganizationId: string;
  isSelectAllMatchingActive?: boolean;
  filterState?: FilterState | null; // Allow null for filterState
  searchTerm?: string;
}): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
  
  const { 
    contactIds = [], 
    targetOrganizationId, 
    isSelectAllMatchingActive = false, 
    filterState = null, 
    searchTerm = '' 
  } = params;

  if (!targetOrganizationId) {
    return { success: false, error: 'Target organization ID is required.' };
  }

  try {
    // 1. Get user session and validate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = session.user.id;
    const userRole = session.user.role;
    const currentOrganizationId = session.user.organizationId; // User's current org context

    // 2. Permission Check: Non-admins can only move contacts *within* their own org
    // (This check might be redundant if non-admins only see their own org in the dropdown, but good for safety)
    if (userRole !== 'admin' && targetOrganizationId !== currentOrganizationId) {
       // Check if the target org exists and if the non-admin user is actually part of it (future enhancement if needed)
       // For now, based on current structure, non-admins only operate within their single org.
       return { success: false, error: 'Permission denied. Non-admins can only manage contacts within their own organization.' };
    }
    
    // Admins need to ensure the target organization exists
    if (userRole === 'admin') {
        const targetOrgExists = await prisma.organization.findUnique({ where: { id: targetOrganizationId }, select: { id: true } });
        if (!targetOrgExists) {
            return { success: false, error: `Target organization (${targetOrganizationId}) not found.` };
        }
    }

    // 3. Determine the list of contact IDs to update
    let finalContactIds: string[] = [];

    if (isSelectAllMatchingActive) {
      // Fetch all matching contact IDs based on filters and search term within the *current* organization
      if (!currentOrganizationId) {
        return { success: false, error: 'Cannot perform "select all" without a current organization context.' };
      }
      
      // Use the correct function to build the where clause including search and filters
      const finalWhere = buildCombinedWhereClause(currentOrganizationId, filterState, searchTerm);

      console.log('Fetching all matching contact IDs with where clause:', JSON.stringify(finalWhere, null, 2));

      const matchingContacts = await prisma.contacts.findMany({
        where: finalWhere,
        select: { id: true },
      });
      finalContactIds = matchingContacts.map(c => c.id);
      console.log(`Found ${finalContactIds.length} matching contacts for bulk send.`);

    } else {
      // Use the explicitly provided contact IDs
      finalContactIds = contactIds;
    }

    if (finalContactIds.length === 0) {
      return { success: true, updatedCount: 0, error: 'No contacts selected or matched for update.' }; // Return success but 0 updated
    }

    // 4. Perform the bulk update
    console.log(`Attempting to update organizationId to ${targetOrganizationId} for ${finalContactIds.length} contacts.`);
    const updateResult = await prisma.contacts.updateMany({
      where: {
        id: { in: finalContactIds },
        // Optional: Add another check to ensure we only update contacts from the user's current org?
        // organizationId: currentOrganizationId, // Might be overly restrictive for Admins if they selected contacts across orgs? Let's omit for now.
      },
      data: {
        organizationId: targetOrganizationId,
        updatedAt: new Date(), // Explicitly update timestamp
      },
    });

    console.log('Bulk update result:', updateResult);

    // 5. Revalidate the contacts path and return success
    revalidatePath('/contacts'); // Adjust path if necessary
    
    return { success: true, updatedCount: updateResult.count };

  } catch (error) {
    console.error('Error in bulkSendContactsToOrg server action:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    // Check for specific Prisma errors if needed
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Example: Foreign key constraint fail (target org doesn't exist)
        // Safely check if field_name exists and is a string before calling includes
        if (error.code === 'P2003' && 
            error.meta && 
            typeof error.meta.field_name === 'string' && 
            error.meta.field_name.includes('organizationId')) {
             return { success: false, error: `Target organization (${targetOrganizationId}) not found or invalid.` };
        }
    }
    return { success: false, error: `Failed to send contacts to organization: ${message}` };
  }
}

// Server action to archive a scenario by creating a new record with a prefixed ID and deleting the old one atomically.
export async function archiveScenario(originalScenarioId: string) {
  const ARCHIVE_ORG_ID = 'cm6mdy0tz0000haz8qjknuykz'; // Fixed archive organization ID

  if (!originalScenarioId) {
    return { success: false, error: 'Scenario ID is required.' };
  }

  try {
    // TODO: Add authorization check here if needed, before the transaction.
    // Fetch the user session and verify they belong to the scenario's current org.

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the original scenario data (fetch all fields)
      const originalScenario = await tx.scenario.findUnique({
        where: { id: originalScenarioId },
      });

      if (!originalScenario) {
        // Throw an error to rollback the transaction
        throw new Error('Scenario not found.');
      }

      // 2. Generate the new archive ID
      const newArchiveId = `archive_${uuidv4()}`;

      // Destructure original scenario, excluding fields not needed or handled separately
      const { 
        id: _originalId, // Exclude original ID
        organizationId: _originalOrgId, // Exclude original org ID
        createdAt: _originalCreatedAt, // Exclude original createdAt
        updatedAt: _originalUpdatedAt, // Exclude original updatedAt
        filters, // Handle filters separately
        ...restOfScenarioData // Keep the rest of the fields
      } = originalScenario;

      // 3. Create the new archived scenario record
      const createdArchivedScenario = await tx.scenario.create({
        data: {
          ...restOfScenarioData,           // Spread the relevant fields
          id: newArchiveId,                // Assign the new ID
          organizationId: ARCHIVE_ORG_ID,   // Assign the archive org ID
          filters: filters ?? Prisma.JsonNull, // Handle filters explicitly
          // Explicitly set timestamps to satisfy TS/Prisma types, DB might override/handle defaults
          createdAt: new Date(), 
          updatedAt: new Date(), 
        },
      });

      // 4. Delete the original scenario record
      await tx.scenario.delete({
        where: { id: originalScenarioId },
      });

      // Return the new ID from the transaction
      return { newId: createdArchivedScenario.id };
    });

    // Revalidate the path where scenarios are listed
    revalidatePath('/settings/scenarios'); // Adjust if the path is different

    return { success: true, scenarioId: result.newId }; // Return the NEW ID

  } catch (error) {
    console.error(`Error archiving scenario ${originalScenarioId}:`, error);

    // Handle specific transaction-related errors or Prisma errors if needed
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
       // Example: Unique constraint violation on the new ID (highly unlikely with UUIDv4)
      if (error.code === 'P2002') {
         return { success: false, error: 'Failed to generate unique archive ID. Please try again.' };
      }
       // Original record not found during transaction
      if (error.code === 'P2025') {
        return { success: false, error: 'Scenario not found during archive process.' };
      }
    } else if (error instanceof Error && error.message === 'Scenario not found.') { // Corrected: Added closing parenthesis
        // Catch the specific error thrown inside the transaction
        return { success: false, error: 'Scenario not found.' };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred while archiving the scenario.' 
    };
  }
}
