import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId || session.user.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ghlIntegration = await prisma.gHLIntegration.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });

    if (ghlIntegration) {
      // Set the location ID cookie for the client
      const cookieStore = await cookies();
      cookieStore.set('ghl_auth', ghlIntegration.locationId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
    }

    return NextResponse.json({ ghlIntegration });
  } catch (error) {
    console.error('Error fetching GHL integration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId || session.user.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.gHLIntegration.deleteMany({
      where: { organizationId }
    });

    // Clear the location ID cookie
    const cookieStore = await cookies();
    cookieStore.delete('ghl_auth');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting GHL integration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 