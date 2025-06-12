import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Adjusted path based on original file

type Body = { id: string; status: string };

export async function POST(req: Request) {
  const body = await req.json();
  // Extract only id and status, allowing other fields to be present but ignored
  const { id, status } = body as { id?: string; status?: string }; 

  if (!id || !status) {
    return NextResponse.json(
      { error: 'id and status required' },
      { status: 400 }
    );
  }

  try {
    // Use raw SQL because EmailMessage model has @@ignore in schema.prisma
    // Note: Using $executeRawUnsafe because 'status' comes from input. 
    // In a real app, sanitize/validate 'status' rigorously or use parameterized queries if possible.
    const result = await prisma.$executeRawUnsafe(
      // Cast the status parameter ($1) to the ConversationStatus enum type
      `UPDATE "EmailMessage" SET status = $1::"ConversationStatus" WHERE id = $2`,
      status, // $1
      id      // $2
    );

    if (result === 0) {
      // No rows were updated, likely means the ID wasn't found
      return NextResponse.json({ error: 'Message not found or status unchanged' }, { status: 404 });
    }

    // $executeRaw returns the number of affected rows, not the updated record
    return NextResponse.json({ success: true, message: `Updated status for message ${id} to ${status}` });
  } catch (err) {
    console.error('[RAW_STATUS_UPDATE]', err);
    // Provide more specific error info if possible, e.g., check err type
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'update failed', details: errorMessage }, { status: 500 });
  }
}
