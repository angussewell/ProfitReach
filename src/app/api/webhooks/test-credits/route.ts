import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { organizationId, credits, isTestMode = true } = body;

    if (!organizationId) {
      return new NextResponse('Missing organizationId', { status: 400 });
    }

    if (typeof credits !== 'number' || credits <= 0) {
      return new NextResponse('Invalid credits value', { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Update organization's credit balance
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          creditBalance: credits,
          lastBillingSync: new Date()
        }
      });

      // Log credit usage
      await tx.creditUsage.create({
        data: {
          organizationId,
          amount: credits,
          description: `Credits added via test endpoint`
        }
      });

      // Log billing event
      await tx.billingEvent.create({
        data: {
          id: `test_${Date.now()}`,
          organizationId,
          type: 'credits_purchased',
          status: 'success',
          amount: 0,
          description: `Added ${credits.toLocaleString()} credits via test endpoint`,
          metadata: body,
          isTestMode
        }
      });
    });

    return new NextResponse('Credits added successfully', { status: 200 });
  } catch (error) {
    console.error('Error processing test credit update:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 