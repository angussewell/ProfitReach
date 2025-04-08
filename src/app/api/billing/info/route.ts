import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Mark route as dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

// Add this interface at the top of the file (after the imports)
interface BillingOrganization {
  billingPlan: string;
  creditBalance: number;
  creditUsage: { amount: number }[];
}

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
        }
      }
    });

    if (!organization) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    // Cast organization to our BillingOrganization type to satisfy TypeScript
    const org = organization as unknown as BillingOrganization;

    // Calculate monthly scenario runs
    const monthlyScenarioRuns = org.creditUsage.reduce(
      (total: number, usage: { amount: number }) => total + Math.abs(usage.amount),
      0
    );
    // Update price: $50 per 5000 credits
    const monthlyScenarioBill = Math.ceil(monthlyScenarioRuns / 5000) * 50;

    return NextResponse.json({
      billingPlan: org.billingPlan,
      creditBalance: org.creditBalance,
      monthlyScenarioRuns,
      monthlyScenarioBill
    });
  } catch (error) {
    console.error('Error fetching billing info:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
