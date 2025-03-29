import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Define validation schema for the request body
const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: z.enum(['user', 'manager']).optional(), // Admins cannot change users to admin, only user or manager
}).strict(); // Disallow extra fields

export async function PATCH(
  request: Request,
  { params }: { params: { organizationId: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Check if the requesting user is authenticated and is an admin
    if (!session?.user?.id || session.user.role !== 'admin') {
      return new NextResponse('Forbidden: Admin access required', { status: 403 });
    }

    // 2. Check if the organizationId and userId from params are valid
    if (!params.organizationId || !params.userId) {
        return new NextResponse('Bad Request: Missing organization or user ID', { status: 400 });
    }
    
    // 3. Validate the request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new NextResponse('Bad Request: Invalid JSON body', { status: 400 });
    }

    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input data', details: validation.error.format() }, { status: 400 });
    }
    
    const dataToUpdate = validation.data;

    // Ensure at least one field is being updated
    if (Object.keys(dataToUpdate).length === 0) {
      return new NextResponse('Bad Request: No fields provided for update', { status: 400 });
    }

    // 4. Get the user to be updated
    const userToUpdate = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { role: true, organizationId: true }
    });

    if (!userToUpdate) {
      return new NextResponse('Not Found: User to update not found', { status: 404 });
    }

    // 5. Verify the target user is NOT an admin
    if (userToUpdate.role === 'admin') {
      return new NextResponse('Forbidden: Cannot edit admin users', { status: 403 });
    }

    // 6. Verify the target user belongs to the admin's specified organization
    // Note: An admin might belong to one org but try to edit a user in another if the URL is manipulated.
    // We fetch the admin's org ID from the session for a secure check.
    if (userToUpdate.organizationId !== params.organizationId || session.user.organizationId !== params.organizationId) {
       return new NextResponse('Forbidden: User does not belong to this organization', { status: 403 });
    }
    
    // 7. Prepare data for update, hash password if provided
    const updatePayload: { name?: string; email?: string; password?: string; role?: 'user' | 'manager' } = {};
    if (dataToUpdate.name) updatePayload.name = dataToUpdate.name;
    if (dataToUpdate.email) updatePayload.email = dataToUpdate.email;
    if (dataToUpdate.role) updatePayload.role = dataToUpdate.role;
    if (dataToUpdate.password) {
      updatePayload.password = await bcrypt.hash(dataToUpdate.password, 12);
    }

    // 8. Perform the update
    try {
        const updatedUser = await prisma.user.update({
            where: { id: params.userId },
            data: updatePayload,
            select: { // Return only non-sensitive data
              id: true,
              name: true,
              email: true,
              role: true,
              organizationId: true,
              updatedAt: true
            }
        });
        return NextResponse.json(updatedUser);
    } catch (error: any) {
         // Handle potential unique constraint errors (e.g., email already exists)
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return new NextResponse('Conflict: Email address already in use', { status: 409 });
        }
        console.error('Error updating user:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }

  } catch (error) {
    console.error('Error in PATCH user route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { organizationId: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Check if the requesting user is authenticated
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Check if the organizationId and userId from params are valid
    if (!params.organizationId || !params.userId) {
      return new NextResponse('Bad Request: Missing organization or user ID', { status: 400 });
    }

    // 3. Don't allow deleting yourself
    if (params.userId === session.user.id) {
      return new NextResponse('Cannot delete your own account', { status: 400 });
    }

    // 4. Get the current user's role and organization
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, organizationId: true }
    });

    if (!currentUser) {
      return new NextResponse('Unauthorized: User not found', { status: 401 });
    }

    // 5. Get the user to be deleted
    const userToDelete = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { role: true, organizationId: true }
    });

    if (!userToDelete) {
      return new NextResponse('Not Found: User to delete not found', { status: 404 });
    }

    // 6. Verify the target user belongs to the specified organization
    if (userToDelete.organizationId !== params.organizationId) {
      return new NextResponse('Forbidden: User does not belong to this organization', { status: 403 });
    }

    // 7. Permission checks based on the current user's role
    if (currentUser.role === 'admin') {
      // Admin can delete any user
    } else if (currentUser.role === 'manager') {
      // Manager can only delete users in their own organization
      if (currentUser.organizationId !== params.organizationId) {
        return new NextResponse('Forbidden: Cannot delete users from other organizations', { status: 403 });
      }
      
      // Manager cannot delete admins or other managers
      if (userToDelete.role === 'admin' || userToDelete.role === 'manager') {
        return new NextResponse('Forbidden: Managers cannot delete admin or manager users', { status: 403 });
      }
    } else {
      // Regular users cannot delete other users
      return new NextResponse('Forbidden: Insufficient permissions', { status: 403 });
    }

    // 8. Delete the user
    await prisma.user.delete({
      where: { id: params.userId }
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 