import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Verify the organization exists and the user has access to it
    const organization = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        users: {
          some: {
            id: session.user.id
          }
        }
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      );
    }

    // Update the user's organization
    await prisma.user.update({
      where: { id: session.user.id },
      data: { organizationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error switching organization:', error);
    return NextResponse.json(
      { error: 'Error switching organization' },
      { status: 500 }
    );
  }
} 