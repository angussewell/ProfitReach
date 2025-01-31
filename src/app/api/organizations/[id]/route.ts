import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
      },
    });

    if (!organization) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    // For non-admin users, verify they have access to this organization
    if (session.user.role !== 'admin') {
      const userOrg = await prisma.user.findFirst({
        where: {
          id: session.user.id,
          organizationId: params.id,
        },
      });

      if (!userOrg) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('[ORGANIZATION_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
} 