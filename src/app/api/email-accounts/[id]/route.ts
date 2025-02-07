import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { EmailAccount } from '@prisma/client';

// Schema for full email account updates
const emailAccountSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(1).optional(), // Password is optional for updates
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  isActive: z.boolean().optional(),
});

// Schema for status-only updates
const statusUpdateSchema = z.object({
  isActive: z.boolean()
});

type EmailAccountUpdate = z.infer<typeof emailAccountSchema>;
type StatusUpdate = z.infer<typeof statusUpdateSchema>;

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Check if this is a status-only update
    const isStatusUpdate = Object.keys(body).length === 1 && 'isActive' in body;
    
    if (isStatusUpdate) {
      const validationResult = statusUpdateSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Invalid data', details: validationResult.error.errors },
          { status: 400 }
        );
      }
      
      // Check if email account exists and belongs to the organization
      const existingAccount = await prisma.emailAccount.findFirst({
        where: {
          id: params.id,
          organizationId: session.user.organizationId,
        },
      });

      if (!existingAccount) {
        return NextResponse.json(
          { error: 'Email account not found' },
          { status: 404 }
        );
      }

      const emailAccount = await prisma.emailAccount.update({
        where: { id: params.id },
        data: {
          isActive: validationResult.data.isActive
        } as Partial<EmailAccount>
      });

      const { password, ...sanitizedAccount } = emailAccount;
      return NextResponse.json(sanitizedAccount);
    }

    // Handle full updates
    const validationResult = emailAccountSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if email account exists and belongs to the organization
    const existingAccount = await prisma.emailAccount.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      );
    }

    // Check if new email already exists (if email is being changed)
    if (data.email !== existingAccount.email) {
      const duplicateEmail = await prisma.emailAccount.findFirst({
        where: {
          email: data.email,
          organizationId: session.user.organizationId,
          NOT: { id: params.id },
        },
      });

      if (duplicateEmail) {
        return NextResponse.json(
          { error: 'Email account already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData = {
      email: data.email,
      name: data.name,
      host: data.host,
      port: data.port,
      ...(data.password && { password: data.password }),
      ...(typeof data.isActive === 'boolean' && { isActive: data.isActive })
    } as Partial<EmailAccount>;

    const emailAccount = await prisma.emailAccount.update({
      where: { id: params.id },
      data: updateData,
    });

    // Don't send password in the response
    const { password, ...sanitizedAccount } = emailAccount;

    return NextResponse.json(sanitizedAccount);
  } catch (error) {
    console.error('Error updating email account:', error);
    return NextResponse.json(
      { error: 'Failed to update email account' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if email account exists and belongs to the organization
    const existingAccount = await prisma.emailAccount.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      );
    }

    await prisma.emailAccount.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting email account:', error);
    return NextResponse.json(
      { error: 'Failed to delete email account' },
      { status: 500 }
    );
  }
} 