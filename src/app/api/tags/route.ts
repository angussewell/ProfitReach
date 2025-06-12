import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth'; // Import getServerSession
import { authOptions } from '@/lib/auth'; // Import authOptions
import prisma from '@/lib/prisma'; // Assuming prisma client is setup

export async function GET() {
  try {
    const session = await getServerSession(authOptions); // Use getServerSession

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Assuming organizationId is stored directly on the user object in the session
    // Adjust if the structure is different (e.g., session.user.organization?.id)
    const organizationId = session.user.organizationId;

    if (!organizationId) {
      console.error('Organization ID not found for user:', session.user.id);
      return NextResponse.json({ success: false, message: 'User organization not found' }, { status: 400 });
    }

    const tags = await prisma.tags.findMany({
      where: {
        organizationId: organizationId,
      },
      select: {
        id: true, // Correct field name based on schema
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ success: true, data: tags });

  } catch (error) {
    console.error('Error fetching tags:', error);
    // Generic error for security
    return NextResponse.json({ success: false, message: 'An error occurred while fetching tags.' }, { status: 500 });
  }
}
