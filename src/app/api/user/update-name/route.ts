import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { name } = await req.json();
    if (!name) {
      return new NextResponse('Name is required', { status: 400 });
    }

    // Update user's name
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name }
    });

    return new NextResponse('Name updated successfully', { status: 200 });
  } catch (error) {
    console.error('Error updating name:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 