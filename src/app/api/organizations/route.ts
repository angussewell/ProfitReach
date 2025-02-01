import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('Fetching organizations for session:', { 
      userId: session.user.id,
      role: session.user.role 
    });

    // Admin users can see all organizations
    // Regular users can only see their organization
    const organizations = session.user.role === 'admin'
      ? await prisma.organization.findMany({
          orderBy: { name: 'asc' }
        })
      : await prisma.organization.findMany({
          where: {
            users: {
              some: { id: session.user.id }
            }
          },
          orderBy: { name: 'asc' }
        });

    console.log('Returning all organizations for admin:', organizations.length);
    
    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return new NextResponse('Name is required', { status: 400 });
    }

    const organization = await prisma.organization.create({
      data: { name }
    });

    return NextResponse.json(organization);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return new NextResponse('Organization name already exists', { status: 400 });
    }
    
    console.error('Error creating organization:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 