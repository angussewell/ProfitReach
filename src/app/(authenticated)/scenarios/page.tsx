import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { ScenarioList } from '@/components/scenarios/ScenarioList';

export default async function ScenariosPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.organizationId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">No Organization</h1>
        <p>Please contact your administrator to be added to an organization.</p>
      </div>
    );
  }

  const scenarios = await prisma.scenario.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      signature: true,
      attachments: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Scenarios</h1>
      <ScenarioList scenarios={scenarios} />
    </div>
  );
} 