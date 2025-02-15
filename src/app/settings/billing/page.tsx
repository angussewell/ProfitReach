import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { BillingForm } from './billing-form';
import { Prisma } from '@prisma/client';

export default async function BillingSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    redirect('/');
  }

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: {
      id: true,
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
      }
    }
  });

  if (!organization) {
    redirect('/');
  }

  const organizationWithBilling = {
    id: organization.id,
    billingPlan: organization.billingPlan || 'unlimited',
    creditBalance: organization.creditBalance || 0,
    creditUsage: organization.creditUsage
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8">Billing Settings</h1>
      <BillingForm organization={organizationWithBilling} />
    </div>
  );
} 