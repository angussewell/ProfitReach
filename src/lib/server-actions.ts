'use server'

import { prisma } from './prisma'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'; // Import Prisma for raw query types

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
