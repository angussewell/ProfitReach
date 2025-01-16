'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RefreshCw, CheckSquare, MessageSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Scenario {
  name: string;
  totalCount: number;
  positiveReplyCount: number;
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#33475b]">All Sequences</h1>
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
          <h1 className="text-2xl font-semibold text-[#33475b]">All Sequences</h1>
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
          <h1 className="text-2xl font-semibold text-[#33475b] mb-1">All Sequences</h1>
          <p className="text-sm text-gray-500">
            Showing all sequences and their response rates
          </p>
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
          <Card key={scenario.name} className="hover:border-[#ff7a59] transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#ff7a59]" />
                {scenario.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-[#ff7a59]">
                  {scenario.totalCount.toLocaleString()}
                </span>
                <span className="text-gray-500">Contacts</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-[#00bda5]">
                  {scenario.positiveReplyCount.toLocaleString()}
                </span>
                <span className="text-gray-500">Responses</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MessageSquare className="w-4 h-4" />
                Response Rate: {((scenario.positiveReplyCount / scenario.totalCount) * 100).toFixed(1)}%
              </div>
              <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#ff7a59] to-[#00bda5]"
                  style={{ 
                    width: `${Math.min((scenario.positiveReplyCount / scenario.totalCount) * 100, 100)}%`,
                    transition: 'width 0.5s ease-in-out'
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 