import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Fetching organizations for session:', {
      userId: session?.user?.id,
      role: session?.user?.role
    });
    
    if (!session?.user) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const specificId = searchParams.get('id');

    // If a specific organization is requested
    if (specificId) {
      const org = await prisma.organization.findUnique({
        where: { id: specificId }
      });
      
      if (!org) {
        console.log('Specific organization not found:', specificId);
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }
      
      return NextResponse.json(org);
    }

    // For admin users, return all organizations
    if (session.user.role === 'admin') {
      const organizations = await prisma.organization.findMany({
        orderBy: { name: 'asc' }
      });
      console.log('Returning all organizations for admin:', organizations.length);
      
      const response = NextResponse.json(organizations);
      response.headers.set('Cache-Control', 'no-store, must-revalidate');
      return response;
    } 
    
    // For regular users, return only their organization
    if (!session.user.organizationId) {
      console.log('User has no organization assigned');
      return NextResponse.json([]);
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId }
    });
    
    console.log('Returning user organization:', organization?.id);
    const response = NextResponse.json([organization].filter(Boolean));
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
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
    console.log('Organization creation attempt:', { userId: session?.user?.id, role: session?.user?.role });
    
    if (!session?.user || session.user.role !== 'admin') {
      console.log('Unauthorized organization creation attempt:', { userId: session?.user?.id, role: session?.user?.role });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name } = await req.json();
    console.log('Creating organization:', { name });
    
    if (!name) {
      console.log('Missing organization name');
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
      console.log('Organization already exists:', { name });
      return NextResponse.json(
        { error: 'Organization with this name already exists' },
        { status: 400 }
      );
    }
    
    const organization = await prisma.organization.create({
      data: { name }
    });
    console.log('Organization created successfully:', { id: organization.id, name: organization.name });

    // Update the admin user's organization
    await prisma.user.update({
      where: { id: session.user.id },
      data: { organizationId: organization.id }
    });
    console.log('Admin user updated:', { userId: session.user.id, organizationId: organization.id });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Failed to create organization:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create organization' },
      { status: 500 }
    );
  }
} 