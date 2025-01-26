'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Scenario {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export default function ManageScenarios() {
  const [scenarios, setScenarios] = React.useState<Scenario[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchScenarios = async () => {
    try {
      const response = await fetch('/api/scenarios');
      const data = await response.json();
      setScenarios(data || []);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchScenarios();
  }, []);

  // Format date consistently using client-side only code
  const formatDate = (dateString: string) => {
    try {
      // Only run on client side
      if (typeof window !== 'undefined') {
        return new Date(dateString).toLocaleString();
      }
      return dateString;
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#33475b]">Manage Scenarios</h1>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2" />
            New Scenario
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#33475b]">Manage Scenarios</h1>
        <Link href="/settings/scenarios/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Scenario
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <Link key={scenario.id} href={`/settings/scenarios/${scenario.id}`}>
            <Card className="hover:border-[#ff7a59] transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>{scenario.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{scenario.type}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Last updated: {formatDate(scenario.updatedAt)}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
} 