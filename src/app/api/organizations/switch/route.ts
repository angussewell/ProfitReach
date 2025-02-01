import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaClient } from '@prisma/client';

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

    // Perform organization switch in a single transaction
    const result = await prisma.$transaction(async (tx: Omit<PrismaClient, '$transaction'>) => {
      // Check if organization exists and user has access
      const org = await tx.organization.findFirst({
        where: {
          id: organizationId,
          ...(session.user.role !== 'admin' && {
            users: { some: { id: session.user.id } }
          })
        },
        select: { id: true, name: true }
      });

      if (!org) {
        throw new Error('Organization not found or access denied');
      }

      // Update user's organization
      const user = await tx.user.update({
        where: { id: session.user.id },
        data: { organizationId: org.id },
        select: { id: true }
      });

      return { org, user };
    });

    console.log('Organization switch successful:', {
      userId: session.user.id,
      organizationId: result.org.id,
      organizationName: result.org.name
    });

    return NextResponse.json({
      organizationId: result.org.id,
      organizationName: result.org.name
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