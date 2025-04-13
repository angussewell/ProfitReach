'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentCard } from '@/components/ui/content-card';
import { ScenarioTypeCard } from '@/components/scenarios/scenario-type-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

export function ManageScenariosContent({ scenarios }: ManageScenariosContentProps): React.ReactElement {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Scenarios</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="default"> {/* Keep default for primary page action */}
              <Plus className="w-4 h-4 mr-2" />
              Create Scenario
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <Link href="/settings/scenarios/create" className="w-full">
              <DropdownMenuItem className="cursor-pointer">
                Create Manual Scenario
              </DropdownMenuItem>
            </Link>
            <Link href="/settings/scenarios/create-ai" className="w-full">
              <DropdownMenuItem className="cursor-pointer">
                Create AI Scenario
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
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
