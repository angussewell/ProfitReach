import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { EmailAccount } from '@prisma/client';
import { UnipileClient } from '@/lib/unipile';

// Schema for account updates
const accountUpdateSchema = z.object({
  name: z.string().min(1),
  isActive: z.boolean().optional()
});

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
    
    // Validate request body
    const validationResult = accountUpdateSchema.safeParse(body);
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

    // Update the account with all provided fields
    const emailAccount = await prisma.emailAccount.update({
      where: { id: params.id },
      data: {
        name: data.name,
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date()
      },
    });

    return NextResponse.json(emailAccount);
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

    // Get the email account
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
    });

    if (!emailAccount) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    console.log('Attempting to delete account:', {
      accountId: params.id,
      unipileAccountId: emailAccount.unipileAccountId
    });

    let unipileDeleteSuccess = true;
    // Try Unipile deletion first
    if (emailAccount.unipileAccountId) {
      try {
        const unipile = new UnipileClient();
        await unipile.deleteAccount(emailAccount.unipileAccountId);
        console.log('Successfully deleted from Unipile:', {
          accountId: params.id,
          unipileAccountId: emailAccount.unipileAccountId
        });
      } catch (unipileError) {
        unipileDeleteSuccess = false;
        console.error('Failed to delete from Unipile:', {
          error: unipileError instanceof Error ? unipileError.message : String(unipileError),
          stack: unipileError instanceof Error ? unipileError.stack : undefined,
          accountId: params.id,
          unipileAccountId: emailAccount.unipileAccountId
        });
        // Continue with database deletion even if Unipile fails
      }
    }

    // Delete from our database
    try {
      await prisma.emailAccount.delete({
        where: {
          id: params.id,
        },
      });
      console.log('Successfully deleted from database:', {
        accountId: params.id
      });

      // If Unipile failed but database succeeded, return partial success
      if (!unipileDeleteSuccess) {
        return NextResponse.json({ 
          warning: 'Account deleted from database but Unipile deletion failed. Please contact support.' 
        }, { status: 207 });
      }

      return NextResponse.json({ success: true });
    } catch (dbError) {
      console.error('Failed to delete from database:', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
        accountId: params.id
      });
      
      return NextResponse.json(
        { error: 'Failed to delete account from database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in delete account handler:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      accountId: params.id
    });
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete email account' },
      { status: 500 }
    );
  }
} 