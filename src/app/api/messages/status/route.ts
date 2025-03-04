import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';  // Import for Prisma error types

// Define the valid conversation statuses
const ConversationStatus = z.enum([
  'MEETING_BOOKED',
  'NOT_INTERESTED',
  'FOLLOW_UP_NEEDED',
  'NO_ACTION_NEEDED'
]);

// Schema for status update request validation
const statusUpdateSchema = z.object({
  threadId: z.string(),
  status: ConversationStatus
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate the request data
    let validatedData;
    try {
      validatedData = statusUpdateSchema.parse(body);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return NextResponse.json(
        { error: 'Invalid request data', details: validationError instanceof Error ? validationError.message : String(validationError) },
        { status: 400 }
      );
    }

    // Get the latest message in the thread to update its status
    const latestMessage = await prisma.emailMessage.findFirst({
      where: {
        threadId: validatedData.threadId,
        organizationId: session.user.organizationId
      },
      orderBy: {
        receivedAt: 'desc'
      }
    });

    if (!latestMessage) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    // Update the status of the latest message
    const updatedMessage = await prisma.emailMessage.update({
      where: {
        id: latestMessage.id
      },
      data: {
        // Use a type assertion to bypass the TypeScript error
        status: validatedData.status as any
      }
    });

    return NextResponse.json({
      message: 'Status updated successfully',
      threadId: validatedData.threadId,
      status: validatedData.status
    });
    
  } catch (error) {
    console.error('Error updating conversation status:', error);
    
    // Enhanced error handling
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma-specific errors
      if (error.code === 'P2003') {
        return NextResponse.json(
          { 
            error: 'Database constraint failed - foreign key constraint',
            details: error.message,
            hint: 'There may be a reference to a non-existent record.'
          },
          { status: 500 }
        );
      } else if (error.code === 'P2025') {
        return NextResponse.json(
          { 
            error: 'Record not found',
            details: error.message
          },
          { status: 404 }
        );
      } else if (error.code === 'P2019' || error.code === 'P2009') {
        return NextResponse.json(
          { 
            error: 'Database schema mismatch - field or column does not exist',
            details: error.message,
            hint: 'The status field might not exist in the database. Please run the SQL migration script to add the ConversationStatus enum and status field.',
            sqlScript: `
-- Create the ConversationStatus enum type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConversationStatus') THEN
        CREATE TYPE "ConversationStatus" AS ENUM ('MEETING_BOOKED', 'NOT_INTERESTED', 'FOLLOW_UP_NEEDED', 'NO_ACTION_NEEDED');
    END IF;
END
$$;

-- Add the status column to the EmailMessage table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'EmailMessage' AND column_name = 'status') THEN
        ALTER TABLE "EmailMessage" ADD COLUMN "status" "ConversationStatus" NOT NULL DEFAULT 'FOLLOW_UP_NEEDED';
    END IF;
END
$$;
            `
          },
          { status: 500 }
        );
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        { 
          error: 'Schema validation error - operation is not valid for the current Prisma schema',
          details: error.message,
          hint: 'The Prisma client may need to be regenerated. Run: npx prisma generate'
        },
        { status: 500 }
      );
    }
    
    // Generic error fallback
    return NextResponse.json(
      { 
        error: 'Failed to update conversation status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 