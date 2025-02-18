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

// Webhook URLs
const WEBHOOK_URLS = [
  'https://messagelm.app.n8n.cloud/webhook-test/sending-replies',
  'https://messagelm.app.n8n.cloud/webhook/sending-replies'
];

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

    const { id } = params;

    // Get the email account
    const emailAccount = await prisma.emailAccount.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        unipileAccountId: true
      }
    });

    if (!emailAccount) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      );
    }

    // Verify organization access
    if (emailAccount.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied to this email account' },
        { status: 403 }
      );
    }

    // Notify webhook endpoints about account deletion
    if (emailAccount.unipileAccountId) {
      try {
        await Promise.all(WEBHOOK_URLS.map(url =>
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: emailAccount.unipileAccountId,
              organizationId: emailAccount.organizationId,
              action: 'delete_account'
            })
          })
        ));
      } catch (error) {
        console.error('Failed to notify webhook endpoints:', error);
        // Continue with deletion even if webhook notification fails
      }
    }

    // Delete the email account
    await prisma.emailAccount.delete({
      where: { id }
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