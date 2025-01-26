import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = await request.json();
    
    if (!organizationId) {
      console.log('No organization ID provided');
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      console.log('User not found:', session.user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      console.log('Organization not found:', organizationId);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Update user's organization
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { organizationId },
      include: {
        organization: {
          select: {
            name: true
          }
        }
      }
    });

    // Add a small delay to ensure database commit
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('User organization updated:', {
      userId: updatedUser.id,
      organizationId: updatedUser.organizationId,
      timestamp: Date.now()
    });

    // Return updated user data with timestamp
    const timestamp = Date.now();
    console.log('Preparing response with timestamp:', timestamp);
    
    const response = NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      organizationId: updatedUser.organizationId,
      organizationName: updatedUser.organization?.name,
      _timestamp: timestamp
    });

    // Set strict no-cache headers
    response.headers.set('Cache-Control', 'no-store, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Organization switch failed:', error);
    return NextResponse.json({
      error: 'Failed to switch organization',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}