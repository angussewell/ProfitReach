import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { PageContainer } from '@/components/layout/PageContainer';
import { ManageScenariosContent } from '@/components/scenarios/manage-scenarios-content';

export default async function ManageScenariosPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.organizationId) {
    return (
      <PageContainer>
        <div className="p-6">
          <p className="text-gray-600">
            Please select an organization to manage scenarios.
          </p>
        </div>
      </PageContainer>
    );
  }

  const scenarios = await prisma.scenario.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      signature: true,
      attachment: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <PageContainer>
      <div className="p-6">
        <ManageScenariosContent scenarios={scenarios} />
      </div>
    </PageContainer>
  );
} 