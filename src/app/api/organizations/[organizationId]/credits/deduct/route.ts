import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logging';

export async function POST(
  request: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    const { organizationId } = params;
    const { webhookLogId, amount = 1 } = await request.json();

    if (!webhookLogId) {
      return NextResponse.json(
        { error: 'webhookLogId is required' },
        { status: 400 }
      );
    }

    // Use a transaction to ensure atomic update
    const result = await prisma.$transaction(async (tx) => {
      // Get current organization state
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          creditBalance: true,
          billingPlan: true
        }
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check if organization has enough credits
      if (organization.billingPlan === 'at_cost' && organization.creditBalance < amount) {
        throw new Error('Insufficient credits');
      }

      // Check if credit was already deducted for this webhook
      const existingUsage = await tx.creditUsage.findFirst({
        where: {
          webhookLogId,
          organizationId
        }
      });

      if (existingUsage) {
        throw new Error('Credit already deducted for this webhook');
      }

      // Deduct credits and create usage record
      const [updatedOrg, creditUsage] = await Promise.all([
        tx.organization.update({
          where: { id: organizationId },
          data: {
            creditBalance: {
              decrement: amount
            }
          },
          select: {
            creditBalance: true
          }
        }),
        tx.creditUsage.create({
          data: {
            organizationId,
            webhookLogId,
            amount,
            description: 'Webhook processing credit deduction'
          }
        })
      ]);

      return {
        remainingCredits: updatedOrg.creditBalance,
        creditUsageId: creditUsage.id
      };
    });

    log('info', 'Successfully deducted credits', {
      organizationId,
      webhookLogId,
      amount,
      remainingCredits: result.remainingCredits
    });

    return NextResponse.json(result);

  } catch (error) {
    log('error', 'Failed to deduct credits', {
      error: error instanceof Error ? error.message : String(error),
      organizationId: params.organizationId
    });

    const errorMessage = error instanceof Error ? error.message : 'Failed to deduct credits';
    const status = errorMessage.includes('not found') ? 404 :
                  errorMessage.includes('Insufficient') ? 402 : 500;

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
} 