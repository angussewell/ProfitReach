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

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        ghlIntegrations: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            locationId: true,
            locationName: true
          }
        }
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error fetching current organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
} 