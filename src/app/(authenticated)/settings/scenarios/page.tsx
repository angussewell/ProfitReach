import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { ContentCard } from '@/components/ui/content-card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function ManageScenariosPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.organizationId) {
    return (
      <PageContainer>
        <PageHeader title="Manage Scenarios" />
        <ContentCard>
          <p className="text-gray-600">
            Please select an organization to manage scenarios.
          </p>
        </ContentCard>
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
      <PageHeader title="Manage Scenarios">
        <Link href="/settings/scenarios/create">
          <Button className="bg-red-500 hover:bg-red-600 transition-all duration-200 text-white shadow-sm hover:shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            Create Scenario
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-4">
        {scenarios.map((scenario) => (
          <ContentCard
            key={scenario.id}
            className="hover:border-red-500 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-1">
                  {scenario.name}
                </h3>
                <p className="text-sm text-slate-500">
                  Type: {scenario.touchpointType}
                </p>
              </div>
              <Link
                href={`/settings/scenarios/${scenario.id}`}
                className="text-red-500 hover:text-red-600 font-medium"
              >
                Edit
              </Link>
            </div>
          </ContentCard>
        ))}

        {scenarios.length === 0 && (
          <ContentCard>
            <p className="text-gray-600 text-center py-8">
              No scenarios found. Create your first scenario to get started.
            </p>
          </ContentCard>
        )}
      </div>
    </PageContainer>
  );
} 