import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteParams = {
  params: { contactId: string };
};

export async function POST(_: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      );
    }

    const organizationId = session.user.organizationId;
    const contactId = params.contactId;

    if (!contactId) {
      return NextResponse.json(
        { message: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const result = await prisma.contacts.updateMany({
      where: {
        id: contactId,
        organizationId,
      },
      data: {
        leadStatus: null,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { message: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pipeline disqualify API error:', error);
    return NextResponse.json(
      { message: 'Failed to disqualify contact' },
      { status: 500 }
    );
  }
}
