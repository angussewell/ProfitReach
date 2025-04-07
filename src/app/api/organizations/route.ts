import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include')?.split(',') || [];
    const includeEmailAccounts = include.includes('emailAccounts');

    console.log('Fetching organizations for session:', { 
      userId: session.user.id,
      role: session.user.role 
    });

    // Admin users can see all organizations
    // Regular users and managers can only see their organization
    const organizations = session.user.role === 'admin'
      ? await prisma.organization.findMany({
          include: {
            emailAccounts: includeEmailAccounts
          },
          orderBy: { name: 'asc' }
        })
      : await prisma.organization.findMany({
          where: {
            users: {
              some: { id: session.user.id }
            }
          },
          include: {
            emailAccounts: includeEmailAccounts
          },
          orderBy: { name: 'asc' }
        });

    console.log('Returning organizations:', organizations.length);
    
    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const organization = await prisma.organization.create({
      data: { name }
    });

    return NextResponse.json(organization);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Organization name already exists' }, { status: 400 });
    }
    
    console.error('Error creating organization:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 });
  }
}
