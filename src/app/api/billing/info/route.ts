import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get organization details with billing info
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        billingPlan: true,
        creditBalance: true,
        creditUsage: {
          where: {
            createdAt: {
              gte: new Date(new Date().setDate(1)) // Start of current month
            }
          },
          select: {
            amount: true
          }
        },
        emailAccounts: {
          where: { isActive: true },
          select: { id: true }
        },
        socialAccounts: {
          where: { isActive: true },
          select: { id: true }
        }
      }
    });

    if (!organization) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    // Calculate monthly scenario runs cost ($30 per 5,000 credits)
    const monthlyScenarioRuns = organization.creditUsage.reduce(
      (total, usage) => total + Math.abs(usage.amount),
      0
    );
    const monthlyScenarioBill = Math.ceil(monthlyScenarioRuns / 5000) * 30;

    // Calculate total active accounts
    const activeAccountsCount = organization.emailAccounts.length + organization.socialAccounts.length;

    // Calculate monthly account bill ($9 per account)
    const monthlyAccountBill = activeAccountsCount * 9;

    return NextResponse.json({
      billingPlan: organization.billingPlan,
      creditBalance: organization.creditBalance,
      connectedAccounts: activeAccountsCount,
      monthlyScenarioRuns,
      monthlyAccountBill,
      monthlyScenarioBill
    });
  } catch (error) {
    console.error('Error fetching billing info:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 