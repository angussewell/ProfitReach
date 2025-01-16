'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, History } from 'lucide-react';

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="group">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.scenarios.map((scenario) => (
          <Card key={scenario.scenario} className="group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium truncate">
                {scenario.scenario}
              </CardTitle>
              {activeTab === 'current' ? (
                <Users className="h-4 w-4 text-hubspot-teal group-hover:scale-110 transition-transform" />
              ) : (
                <History className="h-4 w-4 text-hubspot-orange group-hover:scale-110 transition-transform" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-hubspot-blue animate-float">
                  {scenario.count.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Active Contacts
                </p>
              </div>
              <div className="mt-4 progress-bar">
                <div 
                  className="progress-bar-fill"
                  style={{ 
                    width: `${Math.min((scenario.count / 1000) * 100, 100)}%`,
                    background: activeTab === 'current' 
                      ? 'linear-gradient(90deg, var(--hubspot-teal), var(--hubspot-dark-teal))'
                      : 'linear-gradient(90deg, var(--hubspot-orange), var(--hubspot-dark-orange))'
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="glass-effect">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="past" onValueChange={handleTabChange} className="w-full">
        <TabsList className="glass-effect w-full p-1 mb-6">
          <TabsTrigger 
            value="past" 
            className="flex-1 data-[state=active]:bg-hubspot-orange/10 data-[state=active]:text-hubspot-orange rounded-md px-6 py-2 transition-all"
          >
            <History className="w-4 h-4 mr-2" />
            Past Scenarios
          </TabsTrigger>
          <TabsTrigger 
            value="current"
            className="flex-1 data-[state=active]:bg-hubspot-teal/10 data-[state=active]:text-hubspot-teal rounded-md px-6 py-2 transition-all"
          >
            <Users className="w-4 h-4 mr-2" />
            Current Scenarios
          </TabsTrigger>
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