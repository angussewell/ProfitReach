import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // For regular users, verify they belong to the organization
    if (session.user.role !== 'admin') {
      const userOrg = await prisma.user.findFirst({
        where: {
          id: session.user.id,
          organizationId: organizationId
        }
      });

      if (!userOrg) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Update user's organization
    await prisma.user.update({
      where: { id: session.user.id },
      data: { organizationId }
    });

    // Get updated user data
    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    const timestamp = Date.now();
    console.log('Preparing response with timestamp:', timestamp);

    return NextResponse.json({
      organizationId: updatedUser?.organization?.id,
      organizationName: updatedUser?.organization?.name
    });
  } catch (error) {
    console.error('Error switching organization:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}