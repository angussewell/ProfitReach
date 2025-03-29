import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Only allow admins or users from the same organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, organizationId: true }
    });

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Both regular users and managers are restricted to their organization
    if (user.role !== 'admin' && user.organizationId !== params.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { 
        organizationId: params.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching organization users:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Only allow admins to create users
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, organizationId: true }
    });

    if (!currentUser) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Validate role
    if (role !== 'user' && role !== 'admin' && role !== 'manager') {
      return new NextResponse('Invalid role', { status: 400 });
    }

    // Admin can create any user, manager can only create regular users in their organization
    if (currentUser.role !== 'admin') {
      // Check if manager
      if (currentUser.role !== 'manager') {
        return new NextResponse('Forbidden', { status: 403 });
      }
      
      // Manager can only create users in their own organization
      if (currentUser.organizationId !== params.id) {
        return new NextResponse('Forbidden', { status: 403 });
      }
      
      // Manager cannot create admin users
      if (role === 'admin') {
        return new NextResponse('Managers cannot create admin users', { status: 403 });
      }
    }

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return new NextResponse('Email already in use', { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        organizationId: params.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error creating organization user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new NextResponse('Missing user ID', { status: 400 });
    }

    // Don't allow deleting yourself
    if (userId === session.user.id) {
      return new NextResponse('Cannot delete yourself', { status: 400 });
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, organizationId: true }
    });

    if (!currentUser) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user to be deleted to check their role
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true }
    });

    if (!userToDelete) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Admin can delete any user
    if (currentUser.role === 'admin') {
      // Delete user
      await prisma.user.delete({
        where: { id: userId }
      });
      
      return new NextResponse(null, { status: 204 });
    }
    
    // Manager can only delete regular users in their organization
    if (currentUser.role === 'manager') {
      // Manager can only delete users in their own organization
      if (userToDelete.organizationId !== currentUser.organizationId) {
        return new NextResponse('Cannot delete users from other organizations', { status: 403 });
      }
      
      // Manager cannot delete admins or other managers
      if (userToDelete.role === 'admin' || userToDelete.role === 'manager') {
        return new NextResponse('Managers cannot delete admin or manager users', { status: 403 });
      }
      
      // Delete user
      await prisma.user.delete({
        where: { id: userId }
      });
      
      return new NextResponse(null, { status: 204 });
    }
    
    // Regular users cannot delete other users
    return new NextResponse('Forbidden', { status: 403 });
  } catch (error) {
    console.error('Error deleting organization user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 