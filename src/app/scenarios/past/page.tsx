'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RefreshCw, CheckSquare, MessageSquare, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Scenario {
  name: string;
  totalCount: number;
  positiveReplyCount: number;
  currentCount: number;
  error?: boolean;
}

interface ScenarioResponse {
  scenarios: Scenario[];
  total: number;
  lastUpdated?: string;
  error?: string;
}

export default function PastScenarios() {
  const [data, setData] = React.useState<ScenarioResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingScenario, setLoadingScenario] = React.useState<string | null>(null);

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hubspot/contacts/past-scenarios');
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      setData({
        scenarios: [],
        total: 0,
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
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#33475b] mb-2">All Scenarios</h1>
            <p className="text-base text-gray-600">Loading scenario data...</p>
          </div>
          <button 
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={true}
          >
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading...
          </button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
              <CardHeader className="pb-3">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="h-10 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#33475b] mb-2">All Scenarios</h1>
            <p className="text-base text-gray-600">Unable to load scenario data</p>
          </div>
          <button 
            onClick={fetchScenarios}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-[#ff7a59] border border-[#ff7a59] rounded-lg hover:bg-[#ff7a59] hover:text-white transition-colors"
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
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-[#ff7a59] border border-[#ff7a59] rounded-lg hover:bg-[#ff7a59] hover:text-white transition-colors"
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
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#33475b] mb-2">All Scenarios</h1>
          <p className="text-base text-gray-600">
            Track scenario engagement and response rates
          </p>
          {data?.lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date(data.lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        <button 
          onClick={fetchScenarios}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-[#ff7a59] border border-[#ff7a59] rounded-lg hover:bg-[#ff7a59] hover:text-white transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data?.scenarios.map((scenario) => (
          <Card key={scenario.name} className="hover:border-[#ff7a59] transition-colors relative overflow-hidden">
            {loadingScenario === scenario.name && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-[#ff7a59]" />
              </div>
            )}
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckSquare className="w-5 h-5 text-[#ff7a59]" />
                {scenario.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#ff7a59]">
                    {scenario.totalCount.toLocaleString()}
                  </span>
                  <span className="text-gray-600">Total Contacts</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-[#00bda5]">
                    {scenario.positiveReplyCount.toLocaleString()}
                  </span>
                  <span className="text-gray-600">Responses</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-[#516f90]">
                    {scenario.currentCount.toLocaleString()}
                  </span>
                  <span className="text-gray-600">Currently Active</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  Response Rate: {((scenario.positiveReplyCount / scenario.totalCount) * 100).toFixed(1)}%
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#ff7a59] via-[#00bda5] to-[#516f90]"
                    style={{ 
                      width: `${Math.min((scenario.positiveReplyCount / scenario.totalCount) * 100, 100)}%`,
                      transition: 'width 0.5s ease-in-out'
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 