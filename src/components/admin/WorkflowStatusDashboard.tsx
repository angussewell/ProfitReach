'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, PlayCircle, AlertCircle, PauseCircle, Loader2 } from 'lucide-react';
import { getWorkflowStatusCounts } from '@/lib/server-actions';
import { toast } from 'react-hot-toast';

// Define the structure for the counts
interface StatusCounts {
  pending_schedule: number;
  active: number;
  errored: number;
  waiting_scenario: number;
  [key: string]: number; // Index signature for dynamic access
}

// Define display properties for each status
const statusDisplayConfig: { [key: string]: { label: string; icon: React.ElementType; color: string } } = {
  pending_schedule: { label: 'Pending Schedule', icon: Clock, color: 'text-blue-600' },
  active: { label: 'Active', icon: PlayCircle, color: 'text-emerald-600' },
  errored: { label: 'Errored', icon: AlertCircle, color: 'text-red-600' },
  waiting_scenario: { label: 'Waiting Scenario', icon: PauseCircle, color: 'text-amber-600' },
};

export function WorkflowStatusDashboard() {
  const [counts, setCounts] = useState<StatusCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, startRefreshTransition] = useTransition();

  const fetchCounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getWorkflowStatusCounts();
      if (result.success && result.counts) {
        // Ensure all required statuses are present, even if count is 0
        const initialCounts: StatusCounts = {
          pending_schedule: 0,
          active: 0,
          errored: 0,
          waiting_scenario: 0,
        };
        setCounts({ ...initialCounts, ...result.counts });
      } else {
        throw new Error(result.error || 'Failed to fetch counts.');
      }
    } catch (error) {
      console.error("Error fetching workflow status counts:", error);
      toast.error(`Error fetching counts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCounts(null); // Set to null on error to show error state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const handleRefresh = () => {
    startRefreshTransition(() => {
      fetchCounts();
    });
  };

  const renderSkeleton = () => (
    Array.from({ length: 4 }).map((_, index) => (
      <Card key={`skel-${index}`} className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    ))
  );

  const renderCards = () => {
    if (!counts) {
      return (
        <div className="col-span-full text-center py-10 text-red-500 bg-red-50 border border-red-100 rounded-md">
          Could not load status counts. Please try refreshing.
        </div>
      );
    }

    return Object.entries(statusDisplayConfig).map(([statusKey, config]) => (
      <Card key={statusKey} className="overflow-hidden border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className={`h-1 bg-gradient-to-r ${config.color.replace('text-', 'from-').replace('-600', '-500')} ${config.color.replace('text-', 'to-')}`}></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
          <config.icon className={`h-4 w-4 ${config.color}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${config.color}`}>
            {counts[statusKey]?.toLocaleString() ?? '--'}
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="h-10 w-1 bg-gradient-to-b from-sky-600 to-cyan-600 rounded mr-3"></div>
          <h2 className="text-xl font-semibold text-slate-800">Workflow State Counts</h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading || isRefreshing}>
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? renderSkeleton() : renderCards()}
      </div>
    </div>
  );
}
