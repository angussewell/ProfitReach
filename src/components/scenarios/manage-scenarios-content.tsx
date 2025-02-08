'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentCard } from '@/components/ui/content-card';
import { ScenarioTypeCard } from '@/components/scenarios/scenario-type-card';

interface Scenario {
  id: string;
  name: string;
  description?: string | null;
  touchpointType: string;
  testMode?: boolean;
  isFollowUp?: boolean;
  createdAt: Date;
  signature?: { id: string; name: string } | null;
  snippet?: { id: string; name: string } | null;
  attachment?: { id: string; name: string } | null;
}

interface ManageScenariosContentProps {
  scenarios: Scenario[];
}

export function ManageScenariosContent({ scenarios }: ManageScenariosContentProps) {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Scenarios</h1>
        <Link href="/settings/scenarios/create">
          <Button className="bg-red-500 hover:bg-red-600 transition-all duration-200 text-white shadow-sm hover:shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            Create Scenario
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {scenarios.map((scenario) => (
          <ScenarioTypeCard
            key={scenario.id}
            id={scenario.id}
            name={scenario.name}
            type={scenario.touchpointType}
            description={scenario.description}
            testMode={scenario.testMode}
            isFollowUp={scenario.isFollowUp}
            createdAt={scenario.createdAt}
            signature={scenario.signature}
            snippet={scenario.snippet}
            attachment={scenario.attachment}
          />
        ))}

        {scenarios.length === 0 && (
          <ContentCard>
            <p className="text-gray-600 text-center py-8">
              No scenarios found. Create your first scenario to get started.
            </p>
          </ContentCard>
        )}
      </div>
    </>
  );
} 