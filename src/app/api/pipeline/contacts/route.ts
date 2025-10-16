import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
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

    const contacts = await prisma.contacts.findMany({
      where: {
        organizationId,
        NOT: { leadStatus: null },
      },
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        email: true,
        leadStatus: true,
        threadId: true,
        lastActivityAt: true,
        updatedAt: true,
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const formatted = contacts.map((contact) => {
      const displayName =
        contact.fullName ||
        [contact.firstName, contact.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

      return {
        id: contact.id,
        name: displayName || 'Unnamed Contact',
        email: contact.email ?? '',
        leadStatus: contact.leadStatus,
        threadId: contact.threadId,
        lastActivityAt: contact.lastActivityAt,
        updatedAt: contact.updatedAt,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Pipeline contacts API error:', error);
    return NextResponse.json(
      { message: 'Failed to load pipeline contacts' },
      { status: 500 }
    );
  }
}
