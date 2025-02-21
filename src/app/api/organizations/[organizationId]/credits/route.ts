import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// TODO: Add authentication before production use
// This endpoint is temporarily open for n8n testing
export async function GET(
  request: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    const { organizationId } = params;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        creditBalance: true,
        billingPlan: true
      }
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      creditBalance: organization.creditBalance,
      billingPlan: organization.billingPlan
    });
  } catch (error) {
    console.error('Error checking credits:', error);
    return NextResponse.json(
      { error: 'Failed to check credits' },
      { status: 500 }
    );
  }
} 