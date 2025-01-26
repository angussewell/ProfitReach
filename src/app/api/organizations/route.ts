import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role === 'admin') {
      const organizations = await prisma.organization.findMany({
        orderBy: { name: 'asc' }
      });
      return NextResponse.json(organizations);
    } 
    
    if (!session.user.organizationId) {
      return NextResponse.json([]);
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId }
    });
    
    return NextResponse.json([organization].filter(Boolean));
  } catch (error) {
    console.error('Failed to fetch organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name } = await req.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Check if organization already exists
    const existing = await prisma.organization.findUnique({
      where: { name }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Organization with this name already exists' },
        { status: 400 }
      );
    }
    
    const organization = await prisma.organization.create({
      data: { name }
    });

    // Update the admin user's organization
    await prisma.user.update({
      where: { id: session.user.id },
      data: { organizationId: organization.id }
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Failed to create organization:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
} 