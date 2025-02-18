import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

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

    // First verify the message exists and belongs to the user's organization
    const message = await prisma.emailMessage.findUnique({
      where: { id },
      select: { organizationId: true }
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    if (message.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied to this message' },
        { status: 403 }
      );
    }

    // Delete the message
    await prisma.emailMessage.delete({
      where: { id }
    });

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