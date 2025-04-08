import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const simple = searchParams.get('simple') === 'true';

  try {
    const organizationId = session.user.organizationId;
    const scenarios = await prisma.scenario.findMany({
      where: {
        organizationId,
      },
      select: simple ? {
        id: true,
        name: true,
      } : undefined,
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
  }
}
