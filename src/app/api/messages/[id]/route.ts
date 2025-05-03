import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Keep Prisma import for raw query types

// TODO: Re-enable authorization checks
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
  }

  try {
    // Delete the message using raw SQL since the model is ignored by Prisma Client
    const deleteCount = await prisma.$executeRaw(
      Prisma.sql`DELETE FROM "EmailMessage" WHERE id = ${id}`
    );

    if (deleteCount === 0) {
      // If no rows were deleted, the message was not found
      return NextResponse.json(
        { error: `Message with ID ${id} not found` },
        { status: 404 }
      );
    }

    // Successfully deleted
    return NextResponse.json({ success: true, deletedId: id });

  } catch (error) {
    // Catch potential errors during deletion
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete message',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// TODO: Re-enable authorization checks
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
  }

  let updateData;
  try {
    updateData = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Basic validation: ensure 'status' is provided for update
  // Add more validation as needed for other fields
  if (!updateData || typeof updateData.status !== 'string') {
     return NextResponse.json({ error: 'Missing or invalid "status" field in request body' }, { status: 400 });
  }

  const { status } = updateData;
  // Potentially add other fields to update here: const { status, isRead, ... } = updateData;

  try {
    // Update the message status using raw SQL
    // Add other fields to the SET clause if needed: SET status = ${status}, "isRead" = ${isRead} ...
    const updateCount = await prisma.$executeRaw(
      Prisma.sql`UPDATE "EmailMessage" SET status = ${status} WHERE id = ${id}`
    );

    if (updateCount === 0) {
      // If no rows were updated, the message was not found
      return NextResponse.json(
        { error: `Message with ID ${id} not found` },
        { status: 404 }
      );
    }

    // Successfully updated - return success indicator
    // Optionally, fetch and return the updated record if needed, but requires another query
    return NextResponse.json({ success: true, updatedId: id, status: status });

  } catch (error) {
    // Catch potential errors during update
    console.error('Error updating message:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update message',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
