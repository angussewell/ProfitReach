import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema for PATCH request
const updateSchema = z.object({
  outboundWebhookUrl: z.string().url().nullable()
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        outboundWebhookUrl: true,
        billingPlan: true,
        creditBalance: true,
        creditUsage: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            amount: true,
            description: true,
            createdAt: true
          }
        },
        emailAccounts: {
          where: { isActive: true },
          select: { id: true }
        },
        socialAccounts: {
          where: { isActive: true },
          select: { id: true }
        },
        connectedAccounts: {
          select: {
            id: true,
            accountType: true,
            accountId: true
          }
        },
        ghlIntegrations: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            locationId: true,
            locationName: true
          }
        }
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Calculate active accounts count
    const activeAccountsCount = organization.emailAccounts.length + organization.socialAccounts.length;

    // Add activeAccountsCount to the response
    const response = {
      ...organization,
      activeAccountsCount
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching current organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    // Update organization
    const organization = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        outboundWebhookUrl: validatedData.outboundWebhookUrl
      },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        outboundWebhookUrl: true,
        ghlIntegrations: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            locationId: true,
            locationName: true
          }
        }
      }
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
} 