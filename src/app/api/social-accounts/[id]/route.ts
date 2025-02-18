import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { updateAccountSubscriptionQuantity } from '@/lib/stripe';

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

    // Check if social account exists and belongs to the organization
    const existingAccount = await prisma.socialAccount.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Social account not found' },
        { status: 404 }
      );
    }

    // Update the account with all provided fields
    const socialAccount = await prisma.socialAccount.update({
      where: { id: params.id },
      data: {
        name: data.name,
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date()
      },
    });

    // If isActive status changed, update subscription quantity
    if (data.isActive !== undefined && data.isActive !== existingAccount.isActive) {
      await updateAccountSubscriptionQuantity(session.user.organizationId);
    }

    return NextResponse.json(socialAccount);
  } catch (error) {
    console.error('Error updating social account:', error);
    return NextResponse.json(
      { error: 'Failed to update social account' },
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

    // Get the social account
    const socialAccount = await prisma.socialAccount.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        unipileAccountId: true
      }
    });

    if (!socialAccount) {
      return NextResponse.json(
        { error: 'Social account not found' },
        { status: 404 }
      );
    }

    // Verify organization access
    if (socialAccount.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied to this social account' },
        { status: 403 }
      );
    }

    // Notify webhook endpoints about account deletion
    if (socialAccount.unipileAccountId) {
      try {
        await Promise.all(WEBHOOK_URLS.map(url =>
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: socialAccount.unipileAccountId,
              organizationId: socialAccount.organizationId,
              action: 'delete_social_account'
            })
          })
        ));
      } catch (error) {
        console.error('Failed to notify webhook endpoints:', error);
        // Continue with deletion even if webhook notification fails
      }
    }

    // Delete the social account
    await prisma.socialAccount.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting social account:', error);
    return NextResponse.json(
      { error: 'Failed to delete social account' },
      { status: 500 }
    );
  }
} 