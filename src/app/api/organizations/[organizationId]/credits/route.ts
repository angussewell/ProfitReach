import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logging';

// TODO: Add authentication before production use
// This endpoint is temporarily open for n8n testing
export async function GET(
  request: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    const { organizationId } = params;

    log('info', 'Checking credits for organization', { organizationId });

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        creditBalance: true,
        billingPlan: true
      }
    });

    if (!organization) {
      log('error', 'Organization not found when checking credits', { organizationId });
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    log('info', 'Found organization credits', {
      organizationId,
      creditBalance: organization.creditBalance,
      billingPlan: organization.billingPlan
    });

    return NextResponse.json({
      creditBalance: organization.creditBalance,
      billingPlan: organization.billingPlan
    });
  } catch (error) {
    log('error', 'Error checking credits:', { 
      error: error instanceof Error ? error.message : String(error),
      organizationId: params.organizationId 
    });
    return NextResponse.json(
      { error: 'Failed to check credits' },
      { status: 500 }
    );
  }
} 