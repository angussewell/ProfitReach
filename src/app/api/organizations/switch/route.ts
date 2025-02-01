import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Organization switch attempt:', { 
      userId: session?.user?.id,
      role: session?.user?.role,
      currentOrgId: session?.user?.organizationId
    });

    if (!session?.user) {
      console.log('Unauthorized: No session user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      console.log('Bad request: No organization ID provided');
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    console.log('Attempting organization switch:', {
      userId: session.user.id,
      targetOrgId: organizationId,
      userRole: session.user.role
    });

    // For admin users, just verify the organization exists
    if (session.user.role === 'admin') {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true }
      });

      if (!organization) {
        console.log('Organization not found:', { organizationId });
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      try {
        // Update user's organization
        const updatedUser = await prisma.user.update({
          where: { id: session.user.id },
          data: { organizationId },
          select: { id: true, organizationId: true }
        });

        console.log('Admin organization switch successful:', {
          userId: session.user.id,
          organizationId: organization.id,
          organizationName: organization.name,
          updatedUserId: updatedUser.id,
          updatedOrgId: updatedUser.organizationId
        });

        return NextResponse.json({
          organizationId: organization.id,
          organizationName: organization.name
        });
      } catch (updateError) {
        console.error('Failed to update user organization:', updateError);
        return NextResponse.json({ error: 'Failed to update user organization' }, { status: 500 });
      }
    }

    // For regular users, verify they belong to the organization
    const userOrg = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        users: {
          some: { id: session.user.id }
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!userOrg) {
      console.log('Organization not found or access denied:', { 
        userId: session.user.id,
        organizationId,
        userRole: session.user.role
      });
      return NextResponse.json({ error: 'Organization not found or access denied' }, { status: 404 });
    }

    try {
      // Update user's organization
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: { organizationId },
        select: { id: true, organizationId: true }
      });

      console.log('Organization switch successful:', {
        userId: session.user.id,
        organizationId: userOrg.id,
        organizationName: userOrg.name,
        updatedUserId: updatedUser.id,
        updatedOrgId: updatedUser.organizationId
      });

      return NextResponse.json({
        organizationId: userOrg.id,
        organizationName: userOrg.name
      });
    } catch (updateError) {
      console.error('Failed to update user organization:', updateError);
      return NextResponse.json({ error: 'Failed to update user organization' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error switching organization:', error);
    
    // Handle specific Prisma errors
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        console.error('User not found error:', {
          error: error.message,
          code: error.code,
          meta: error.meta
        });
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 });
  }
}