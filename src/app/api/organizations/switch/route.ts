import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Organization switch attempt:', { 
      userId: session?.user?.id
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

    // Verify organization exists and user has access in a single query
    const userOrg = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        OR: [
          { users: { some: { id: session.user.id } } },
          { users: { some: { role: 'admin' } } }
        ]
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!userOrg) {
      console.log('Organization not found or access denied:', { 
        userId: session.user.id,
        organizationId 
      });
      return NextResponse.json({ error: 'Organization not found or access denied' }, { status: 404 });
    }

    // Update user's organization
    await prisma.user.update({
      where: { id: session.user.id },
      data: { organizationId }
    });

    console.log('Organization switch successful:', {
      userId: session.user.id,
      organizationId: userOrg.id,
      organizationName: userOrg.name
    });

    return NextResponse.json({
      organizationId: userOrg.id,
      organizationName: userOrg.name
    });
    
  } catch (error) {
    console.error('Error switching organization:', error);
    
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 });
  }
}