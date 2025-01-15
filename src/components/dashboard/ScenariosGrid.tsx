'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface ScenarioCount {
  scenario: string;
  count: number;
}

interface ScenarioData {
  scenarios: ScenarioCount[];
}

export default function ScenariosGrid() {
  const [pastScenarios, setPastScenarios] = useState<ScenarioData | null>(null);
  const [currentScenarios, setCurrentScenarios] = useState<ScenarioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('past');
  const [loadingPast, setLoadingPast] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(false);

  const fetchPastScenarios = async () => {
    try {
      setLoadingPast(true);
      setError(null);
      const response = await fetch('/api/hubspot/scenarios/count');
      if (!response.ok) {
        throw new Error('Failed to fetch past scenarios');
      }
      const data = await response.json();
      setPastScenarios(data);
    } catch (error) {
      console.error('Error fetching past scenarios:', error);
      setError('Failed to fetch past scenarios');
    } finally {
      setLoadingPast(false);
    }
  };

  const fetchCurrentScenarios = async () => {
    try {
      setLoadingCurrent(true);
      setError(null);
      const response = await fetch('/api/hubspot/scenarios/current');
      if (!response.ok) {
        throw new Error('Failed to fetch current scenarios');
      }
      const data = await response.json();
      setCurrentScenarios(data);
    } catch (error) {
      console.error('Error fetching current scenarios:', error);
      setError('Failed to fetch current scenarios');
    } finally {
      setLoadingCurrent(false);
    }
  };

  useEffect(() => {
    // Load past scenarios by default
    fetchPastScenarios();
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'current' && !currentScenarios && !loadingCurrent) {
      fetchCurrentScenarios();
    }
  };

  const renderScenarios = (scenarios: ScenarioData | null, loading: boolean) => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-[200px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[100px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!scenarios) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.scenarios.map((scenario) => (
          <Card key={scenario.scenario}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {scenario.scenario}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{scenario.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="past" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="past">Past Scenarios</TabsTrigger>
          <TabsTrigger value="current">Current Scenarios</TabsTrigger>
        </TabsList>
        
        <TabsContent value="past" className="mt-4">
          {renderScenarios(pastScenarios, loadingPast)}
        </TabsContent>
        
        <TabsContent value="current" className="mt-4">
          {renderScenarios(currentScenarios, loadingCurrent)}
        </TabsContent>
      </Tabs>
    </div>
  );
} 