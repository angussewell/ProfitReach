import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Organization switch attempt:', { 
      userId: session?.user?.id,
      role: session?.user?.role,
      currentOrgId: session?.user?.organizationId,
      session: JSON.stringify(session)
    });

    if (!session?.user) {
      console.log('Unauthorized: No session user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure we have a user ID in the session
    if (!session.user.id) {
      console.log('Missing user ID in session');
      return NextResponse.json({ error: 'Invalid session - missing user ID' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      console.log('Bad request: No organization ID provided');
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Add extra debugging for the session user ID
    console.log('Looking up user with ID:', session.user.id);

    // Verify user exists before attempting switch
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!user) {
      console.log('User not found:', { userId: session.user.id });
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Check if organization exists and user has access
    const org = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        ...(user.role !== 'admin' && {
          users: { some: { id: user.id } }
        })
      },
      select: { id: true, name: true }
    });

    if (!org) {
      console.log('Organization not found or access denied:', { organizationId });
      return NextResponse.json({ error: 'Organization not found or access denied' }, { status: 404 });
    }

    // Update user's organization
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { organizationId: org.id },
      select: { id: true }
    });

    console.log('Organization switch successful:', {
      userId: user.id,
      organizationId: org.id,
      organizationName: org.name
    });

    return NextResponse.json({
      organizationId: org.id,
      organizationName: org.name
    });

  } catch (error) {
    console.error('Error switching organization:', error);
    
    if (error instanceof PrismaClientKnownRequestError) {
      console.error('Prisma error details:', {
        code: error.code,
        message: error.message,
        meta: error.meta
      });
    }
    
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
