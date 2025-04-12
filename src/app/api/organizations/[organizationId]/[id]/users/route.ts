import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Import Prisma for error types
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // Import crypto for UUID generation

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
      // Return specific JSON error if email already exists
      return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 400 });
    }

    // If email is not in use, proceed with creation attempt
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUserId = crypto.randomUUID();
    const now = new Date();

    // Inner try specifically for the database operation
    try {
      await prisma.$executeRaw`
        INSERT INTO "User" (
          "id", "name", "email", "password", "role", "organizationId", "createdAt", "updatedAt"
        ) VALUES (
          ${newUserId}, ${name}, ${email}, ${hashedPassword}, ${role}, ${params.id}, ${now}, ${now}
        )
      `;

      // Fetch the newly created user to return it
      const newUser = await prisma.user.findUnique({
        where: { id: newUserId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!newUser) {
        // This should ideally not happen if the insert succeeded
        console.error('Failed to fetch newly created user with ID:', newUserId);
        return NextResponse.json({ success: false, error: 'Failed to retrieve created user' }, { status: 500 });
      }

      return NextResponse.json(newUser);

    } catch (dbError) { // Catch specific DB errors from $executeRaw
      console.error('Database error creating organization user:', dbError);

      // Check for unique constraint violation (email) - More robust check
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError &&
        dbError.code === 'P2002' &&
        Array.isArray(dbError.meta?.target) && // Check if target is an array
        dbError.meta.target.includes('email')
      ) {
        // This case might be redundant now due to the initial check, but kept for safety
        return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 400 });
      }
      // Other DB errors
      return NextResponse.json({ success: false, error: 'Database operation failed' }, { status: 500 });
    }

  } catch (error) { // Outer catch for general errors (session, validation, etc.)
    console.error('Error in POST /users handler:', error);
    // Handle potential non-DB errors from earlier checks if necessary,
    // otherwise fall through to generic error
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
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
