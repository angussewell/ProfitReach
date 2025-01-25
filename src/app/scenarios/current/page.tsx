'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Scenario {
  id: string;
  name: string;
  count: number;
  lastUpdated: string;
  error?: boolean;
}

interface ScenarioResponse {
  scenarios: Scenario[];
  total: number;
  lastUpdated: string;
  error?: string;
}

export default function CurrentScenarios() {
  const [data, setData] = React.useState<ScenarioResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scenarios/current');
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      setData({
        scenarios: [],
        total: 0,
        lastUpdated: new Date().toISOString(),
        error: 'Failed to fetch scenarios'
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchScenarios();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#33475b]">Active Sequences</h1>
          <button 
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={true}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#33475b]">Active Sequences</h1>
          <button 
            onClick={fetchScenarios}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#ff7a59] border border-[#ff7a59] rounded-lg hover:bg-[#ff7a59] hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-gray-500 mb-4">{data.error}</p>
            <button 
              onClick={fetchScenarios}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#ff7a59] border border-[#ff7a59] rounded-lg hover:bg-[#ff7a59] hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#33475b] mb-1">Active Sequences</h1>
          {data?.lastUpdated && (
            <p className="text-sm text-gray-500">Last updated: {data.lastUpdated}</p>
          )}
        </div>
        <button 
          onClick={fetchScenarios}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#ff7a59] border border-[#ff7a59] rounded-lg hover:bg-[#ff7a59] hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data?.scenarios.map((scenario) => (
          <Card key={scenario.id} className="hover:border-[#ff7a59] transition-colors">
            <CardHeader>
              <CardTitle>{scenario.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-[#ff7a59]">
                  {scenario.count.toLocaleString()}
                </span>
                <span className="text-gray-500">Active Contacts</span>
              </div>
              {scenario.lastUpdated && (
                <p className="text-sm text-gray-500 mt-4">
                  Last updated: {new Date(scenario.lastUpdated).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 