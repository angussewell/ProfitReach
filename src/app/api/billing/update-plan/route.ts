import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { plan } = await req.json();

    if (!['unlimited', 'at_cost'].includes(plan)) {
      return new NextResponse('Invalid plan', { status: 400 });
    }

    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: { billingPlan: plan },
    });

    return new NextResponse('Plan updated', { status: 200 });
  } catch (error) {
    console.error('Error updating plan:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
} 