import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { updateAccountSubscriptionQuantity } from '@/lib/stripe';

// Schema for account updates
const accountUpdateSchema = z.object({
  name: z.string().min(1),
  isActive: z.boolean().optional(),
  emailAccountId: z.string().nullable().optional()
});

// Unipile configuration from environment variables
const UNIPILE_FULL_DSN = process.env.UNIPILE_DSN || 'api4.unipile.com:13465';
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
const UNIPILE_API_URL = `https://${UNIPILE_FULL_DSN}`;

// Webhook URLs
const WEBHOOK_URLS = [
  'https://n8n.srv768302.hstgr.cloud/webhook-test/sending-replies', // Keep the test URL for now
  'https://n8n-n8n.swl3bc.easypanel.host/webhook/sending-replies'
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
        ...(data.emailAccountId !== undefined && { emailAccountId: data.emailAccountId }),
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

    // Delete account from Unipile if unipileAccountId exists
    if (socialAccount.unipileAccountId && UNIPILE_API_KEY) {
      try {
        console.log(`🗑️ Deleting social account from Unipile:`, {
          unipileAccountId: socialAccount.unipileAccountId,
          timestamp: new Date().toISOString()
        });

        const unipileUrl = `${UNIPILE_API_URL}/api/v1/accounts/${socialAccount.unipileAccountId}`;
        const response = await fetch(unipileUrl, {
          method: 'DELETE',
          headers: {
            'X-API-KEY': UNIPILE_API_KEY,
            'Accept': 'application/json'
          }
        });
        
        const responseStatus = response.status;
        const responseBody = await response.text();
        
        if (response.ok) {
          console.log(`✅ Successfully deleted account from Unipile:`, {
            unipileAccountId: socialAccount.unipileAccountId,
            status: responseStatus,
            response: responseBody,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error(`❌ Failed to delete account from Unipile:`, {
            unipileAccountId: socialAccount.unipileAccountId,
            status: responseStatus,
            error: responseBody,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`❌ Error calling Unipile delete API:`, {
          unipileAccountId: socialAccount.unipileAccountId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        // Continue with local deletion even if Unipile API call fails
      }
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
