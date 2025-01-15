'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, History, Users, ArrowRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConnectedContactsCount {
  total: number;
}

interface LifecycleStage {
  label: string;
  value: string;
  count: number;
}

interface LifecycleStagesData {
  stages: LifecycleStage[];
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying fetch... ${retries} attempts remaining`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

export default function Home() {
  const { data: session, status } = useSession();
  const [connectedCount, setConnectedCount] = useState<number | null>(null);
  const [lifecycleStages, setLifecycleStages] = useState<LifecycleStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        if (!session?.accessToken) {
          console.log('No access token available');
          return;
        }

        const options = {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          },
        };

        const [connectedResponse, lifecycleResponse] = await Promise.all([
          fetchWithRetry('/api/hubspot/contacts/connected', options),
          fetchWithRetry('/api/hubspot/contacts/lifecycle', options)
        ]);

        const connectedData: ConnectedContactsCount = await connectedResponse.json();
        const lifecycleData: LifecycleStagesData = await lifecycleResponse.json();

        setConnectedCount(connectedData.total);
        setLifecycleStages(lifecycleData.stages);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    }

    if (session?.accessToken) {
      fetchData();
    }
  }, [session]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f8fa]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#2d3e50] mb-4">Welcome to HubSpot Dashboard</h1>
          <p className="text-[#516f90] mb-8">Please sign in to access your dashboard</p>
          <Link 
            href="/auth/signin"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#ff7a59] hover:bg-[#ff8f73] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff7a59]"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...(lifecycleStages?.map(stage => stage.count) || [1]));

  return (
    <div className="min-h-screen bg-[#f5f8fa] p-8 space-y-8">
      {error && (
        <Alert variant="destructive" className="bg-white border-red-100 text-red-600">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <h1 className="text-3xl font-bold text-[#2d3e50]">Dashboard</h1>
        <p className="mt-2 text-[#516f90]">
          Overview of your HubSpot campaign performance
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#516f90]">Connected Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-[#ff7a59]" />
              <span className="text-2xl font-bold text-[#2d3e50]">
                {loading ? '...' : connectedCount?.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle Pipeline */}
      <div>
        <h2 className="text-xl font-semibold text-[#2d3e50] mb-6">Contact Lifecycle Pipeline</h2>
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="animate-pulse h-48 bg-gray-100 rounded"></div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-6">
                  {lifecycleStages.map((stage, index) => (
                    <div key={stage.value} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#516f90]">{stage.label}</span>
                        <span className="text-sm font-bold text-[#2d3e50]">{stage.count.toLocaleString()}</span>
                      </div>
                      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-[#ff7a59] rounded-full transition-all duration-500"
                          style={{ width: `${(stage.count / maxCount) * 100}%` }}
                        ></div>
                      </div>
                      {index < lifecycleStages.length - 1 && (
                        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                          <ArrowRight className="w-4 h-4 text-[#516f90]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Access Cards */}
      <div>
        <h2 className="text-xl font-semibold text-[#2d3e50] mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/scenarios/current">
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-[#516f90] group-hover:text-[#ff7a59] flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Current Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#516f90]">
                  View active campaign scenarios
                </p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/scenarios/past">
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-[#516f90] group-hover:text-[#ff7a59] flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Past Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#516f90]">
                  View completed campaign scenarios
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Documentation */}
      <div>
        <h2 className="text-xl font-semibold text-[#2d3e50] mb-4">Getting Started</h2>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none">
              <p className="text-[#516f90]">Welcome to your HubSpot Campaign Dashboard! Here's how to use it:</p>
              <ul className="list-disc pl-5 space-y-2 text-[#516f90]">
                <li><span className="font-medium text-[#2d3e50]">Connected Contacts:</span> Total number of contacts marked as connected</li>
                <li><span className="font-medium text-[#2d3e50]">Lifecycle Pipeline:</span> View contacts at each stage of your sales pipeline</li>
                <li><span className="font-medium text-[#2d3e50]">Current Scenarios:</span> View contacts currently in campaign sequences</li>
                <li><span className="font-medium text-[#2d3e50]">Past Scenarios:</span> View contacts who have completed campaign sequences</li>
              </ul>
              <p className="text-sm text-[#516f90] mt-4">
                Click on any card above to explore detailed metrics.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
