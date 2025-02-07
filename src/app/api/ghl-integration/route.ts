import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting GHL integration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 