'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from 'next-auth/react';
import { Users } from 'lucide-react';

interface ScenarioCount {
  scenario: string;
  count: number;
}

interface ScenarioData {
  scenarios: ScenarioCount[];
  error?: string;
}

export default function CurrentScenariosPage() {
  const { data: session, status } = useSession();
  const [scenarios, setScenarios] = useState<ScenarioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScenarios() {
      try {
        setLoading(true);
        setError(null);

        if (status === 'loading') return;
        
        if (!session?.accessToken) {
          setError('Please sign in to view scenarios');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/hubspot/scenarios/current', {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch current scenarios');
        }

        const data = await response.json();
        setScenarios(data);
      } catch (error) {
        console.error('Error fetching current scenarios:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch current scenarios');
      } finally {
        setLoading(false);
      }
    }

    fetchScenarios();
  }, [session, status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f8fa]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff7a59]"></div>
      </div>
    );
  }

  if (!session?.accessToken) {
    return (
      <Alert className="bg-white border-0 shadow-sm">
        <AlertDescription>
          Please sign in to view current scenarios
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8fa] p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#2d3e50]">Current Scenarios</h1>
        <p className="mt-2 text-[#516f90]">
          View the number of contacts currently in each scenario
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-white border-red-100 text-red-600">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Loading skeletons
          [...Array(6)].map((_, i) => (
            <Card key={i} className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-[200px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[100px]" />
              </CardContent>
            </Card>
          ))
        ) : scenarios?.scenarios.length === 0 ? (
          <div className="col-span-full">
            <Alert className="bg-white border-0 shadow-sm">
              <AlertDescription>
                No current scenarios found
              </AlertDescription>
            </Alert>
          </div>
        ) : scenarios?.scenarios.map((scenario) => (
          <Card key={scenario.scenario} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#516f90]">
                {scenario.scenario}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-[#ff7a59]" />
                <p className="text-2xl font-bold text-[#2d3e50]">{scenario.count.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 