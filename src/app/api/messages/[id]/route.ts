import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Import Prisma for raw query types

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const organizationId = session.user.organizationId;

    // First verify the message exists and belongs to the user's organization using raw SQL
    const messages: { organizationId: string }[] = await prisma.$queryRaw(
      Prisma.sql`SELECT "organizationId" FROM "EmailMessage" WHERE id = ${id}`
    );

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    } // <-- Added missing closing brace here
    const message = messages[0];

    if (message.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied to this message' },
        { status: 403 }
      );
    }

    // Delete the message using raw SQL
    const deleteCount = await prisma.$executeRaw(
      Prisma.sql`DELETE FROM "EmailMessage" WHERE id = ${id}`
    );

    if (deleteCount === 0) {
      // Should not happen if the previous check passed, but good practice
      return NextResponse.json(
        { error: 'Message not found during deletion attempt' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
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
