import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { BillingForm } from './billing-form';
import { EmailAccount, SocialAccount } from '@prisma/client';

interface ConnectedAccount {
  id: string;
  accountType: string;
  accountId: string;
}

export default async function BillingSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    redirect('/');
  }

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    include: {
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
      subscriptions: true,
      connectedAccounts: true,
      emailAccounts: {
        where: { isActive: true },
        select: {
          id: true,
          email: true
        }
      },
      socialAccounts: {
        where: { isActive: true },
        select: {
          id: true,
          provider: true,
          username: true
        }
      }
    },
  });

  if (!organization) {
    redirect('/');
  }

  // Combine all active accounts for display
  const allConnectedAccounts: ConnectedAccount[] = [
    ...organization.emailAccounts.map(account => ({
      id: account.id,
      accountType: 'email',
      accountId: account.email
    })),
    ...organization.socialAccounts.map(account => ({
      id: account.id,
      accountType: account.provider,
      accountId: account.username
    }))
  ];

  const organizationWithAccounts = {
    id: organization.id,
    billingPlan: organization.billingPlan || 'unlimited',
    creditBalance: organization.creditBalance || 0,
    creditUsage: organization.creditUsage,
    connectedAccounts: allConnectedAccounts,
    activeAccountsCount: organization.emailAccounts.length + organization.socialAccounts.length
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8">Billing Settings</h1>
      <BillingForm organization={organizationWithAccounts} />
    </div>
  );
} 