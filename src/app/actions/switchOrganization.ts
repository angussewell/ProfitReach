'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function switchOrganization(organizationId: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    // Only admins can switch organizations
    if (session.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Update user's organization and return full data
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { organizationId },
      include: { organization: true }
    });

    // Force revalidation of all pages
    revalidatePath('/', 'layout');
    
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      organizationId: updatedUser.organizationId,
      organizationName: updatedUser.organization?.name
    };
  } catch (error) {
    console.error('Failed to switch organization:', error);
    throw error;
  }
} 