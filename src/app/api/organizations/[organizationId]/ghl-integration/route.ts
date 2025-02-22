import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { log } from '@/lib/logging';

// Validation schema for PATCH request
const updateSchema = z.object({
  locationId: z.string().min(1)
});

export async function PATCH(
  request: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has an organization
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update this organization
    if (session.user.organizationId !== params.organizationId) {
      log('warn', 'Unauthorized organization update attempt', {
        userId: session.user.id,
        userOrganizationId: session.user.organizationId,
        targetOrganizationId: params.organizationId
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    // Log the update attempt
    log('info', 'Attempting to update organization location ID', {
      organizationId: params.organizationId,
      newLocationId: validatedData.locationId
    });

    // Update organization's location ID
    const organization = await prisma.organization.update({
      where: { id: params.organizationId },
      data: {
        locationId: validatedData.locationId
      },
      select: {
        id: true,
        locationId: true
      }
    });

    // Log successful update
    log('info', 'Successfully updated organization location ID', {
      organizationId: organization.id,
      locationId: organization.locationId
    });

    return NextResponse.json(organization);
  } catch (error) {
    // Log the error with full details
    log('error', 'Error updating location ID', {
      error: error instanceof Error ? error.message : String(error),
      organizationId: params.organizationId,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.errors },
        { status: 400 }
      );
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'This location ID is already in use by another organization' },
          { status: 409 }
        );
      }
    }

    // Handle all other errors
    return NextResponse.json(
      { error: 'Failed to update location ID' },
      { status: 500 }
    );
  }
} 