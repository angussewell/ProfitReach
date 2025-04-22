'use server';

import { prisma } from './prisma';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client'; // Import Prisma for types
import { v4 as uuidv4 } from 'uuid'; // Import uuid

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
    } else if (error instanceof Error && error.message === 'Scenario not found.') {
        // Catch the specific error thrown inside the transaction
        return { success: false, error: 'Scenario not found.' };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred while archiving the scenario.' 
    };
  }
}
