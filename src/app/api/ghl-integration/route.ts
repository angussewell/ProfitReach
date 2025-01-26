import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ghlIntegration = await prisma.GHLIntegration.findFirst({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ ghlIntegration });
  } catch (error) {
    console.error('Error fetching GHL integration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.GHLIntegration.deleteMany({
      where: { organizationId: session.user.organizationId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting GHL integration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 