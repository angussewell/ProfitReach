import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await auth();
  
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Only admins can create organizations
  if (session.user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { name } = await req.json();

    if (!name) {
      return new NextResponse('Organization name is required', { status: 400 });
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: { name }
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Failed to create organization:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 