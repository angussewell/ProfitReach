import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: params.organizationId },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // For non-admin users, verify they have access to this organization
    if (session.user.role !== 'admin') {
      const userOrg = await prisma.user.findFirst({
        where: {
          id: session.user.id,
          organizationId: params.organizationId,
        },
      });

      if (!userOrg) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('[ORGANIZATION_GET]', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { organizationId: string } }
) {
  // ... rest of the code ...
}

export async function DELETE(
  request: Request,
  { params }: { params: { organizationId: string } }
) {
  // ... rest of the code ...
} 