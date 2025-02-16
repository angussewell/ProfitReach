import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { EmailAccount } from '@prisma/client';
import { UnipileClient } from '@/lib/unipile';
import { updateAccountSubscriptionQuantity } from '@/lib/stripe';
import { Prisma } from '@prisma/client';

// Schema for account updates
const accountUpdateSchema = z.object({
  name: z.string().min(1),
  isActive: z.boolean().optional()
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  let requestBody;
  let validationResult;
  let existingAccount;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requestBody = await request.json();
    
    console.log('Updating email account:', {
      accountId: params.id,
      body: requestBody,
      organizationId: session.user.organizationId,
      timestamp: new Date().toISOString()
    });
    
    // Validate request body
    validationResult = accountUpdateSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid data', 
          details: validationResult.error.errors,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if email account exists and belongs to the organization
    existingAccount = await prisma.emailAccount.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        organizationId: true,
        unipileAccountId: true
      }
    });

    if (!existingAccount) {
      return NextResponse.json(
        { 
          error: 'Email account not found',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Update the account with only the specified fields
    const emailAccount = await prisma.emailAccount.update({
      where: { id: params.id },
      data: {
        name: data.name,
        ...(data.isActive !== undefined && { isActive: data.isActive })
      },
      select: {
        id: true,
        name: true,
        email: true,
        unipileAccountId: true,
        createdAt: true,
        updatedAt: true,
        isActive: true
      }
    });

    // If isActive status changed, update subscription quantity
    if (data.isActive !== undefined && data.isActive !== existingAccount.isActive) {
      await updateAccountSubscriptionQuantity(session.user.organizationId);
    }

    const duration = Date.now() - startTime;
    console.log('Email account updated successfully:', {
      accountId: params.id,
      duration,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(emailAccount);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Error updating email account:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
        meta: error instanceof Prisma.PrismaClientKnownRequestError ? error.meta : undefined
      } : String(error),
      params,
      requestBody,
      validationResult,
      existingAccount: existingAccount ? {
        id: existingAccount.id,
        name: existingAccount.name,
        isActive: existingAccount.isActive
      } : null,
      duration,
      timestamp: new Date().toISOString()
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const errorMessage = error.code === 'P2002' ? 'This email account already exists' :
                          error.code === 'P2025' ? 'Email account not found' :
                          error.code === 'P2003' ? 'Operation failed due to related records' :
                          `Database error: ${error.message}`;
      
      return NextResponse.json(
        { 
          error: errorMessage,
          code: error.code,
          meta: error.meta
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update email account'
      },
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
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
} 