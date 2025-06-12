import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Scenario {
  id: string;
  name: string;
  description?: string | null;
  touchpointType: string;
  status: string;
  createdAt: Date;
  signature?: {
    name: string;
  } | null;
  attachment?: {
    name: string;
  } | null;
}

interface ScenarioListProps {
  scenarios: Scenario[];
}

export function ScenarioList({ scenarios }: ScenarioListProps) {
  if (!scenarios.length) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No scenarios yet</h3>
        <p className="text-gray-500 mb-4">Get started by creating your first scenario</p>
<Link href="/settings/scenarios/new">
  <Button variant="default" size="default">Create Scenario</Button>
</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {scenarios.map((scenario) => (
        <Link key={scenario.id} href={`/settings/scenarios/${scenario.id}`}>
          <Card className="p-6 border-2 border-neutral-300 rounded-lg shadow-sm hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{scenario.name}</h3>
            {scenario.description && (
              <p className="text-gray-500 mb-4 line-clamp-2">{scenario.description}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="capitalize">{scenario.touchpointType}</span>
              <span>•</span>
              <span className="capitalize">{scenario.status}</span>
            </div>
            {scenario.signature && (
              <div className="mt-2 text-sm text-gray-500">
                Signature: {scenario.signature.name}
              </div>
            )}
            {scenario.attachment && (
              <div className="mt-2 text-sm text-gray-500">
                Attachment: {scenario.attachment.name}
              </div>
            )}
          </Card>
        </Link>
      ))}
    </div>
  );
}
