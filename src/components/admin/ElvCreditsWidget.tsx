'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Define the structure of the data expected from our API route
interface ElvCreditsWidgetData {
  onDemandAvailable: number | null;
  dailyAvailable: number | null;
  dailyTotal: number | null;
  refreshIn: string | null;
}

export function ElvCreditsWidget() {
  const [credits, setCredits] = useState<ElvCreditsWidgetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCredits(null); // Clear previous credits on new fetch

    try {
      const response = await fetch('/api/admin/elv-credits');

      if (!response.ok) {
        let errorMsg = `Error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData?.error || errorMsg;
        } catch {
          // Ignore if error response is not JSON
        }
        throw new Error(errorMsg);
      }

      const data: ElvCreditsWidgetData = await response.json();
      setCredits(data);
      toast.success('ELV credits refreshed successfully!');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Failed to fetch ELV credits:', message);
      setError(message);
      toast.error(`Failed to fetch credits: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">
          EmailListVerify Credits
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCredits}
          disabled={isLoading}
          className="h-8 px-3 text-xs"
        >
          {isLoading ? (
            <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3 w-3" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[180px]" />
            <Skeleton className="h-4 w-[160px]" />
          </div>
        )}

        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Fetching Credits</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && credits && (
          <div className="text-sm text-slate-700 space-y-1">
            <p><strong>On-Demand Available:</strong> {credits.onDemandAvailable?.toLocaleString() ?? 'N/A'}</p>
            <p><strong>Daily Available:</strong> {credits.dailyAvailable?.toLocaleString() ?? 'N/A'}</p>
            <p><strong>Daily Total:</strong> {credits.dailyTotal?.toLocaleString() ?? 'N/A'}</p>
            <p><strong>Daily Refresh In:</strong> {credits.refreshIn ?? 'N/A'}</p>
          </div>
        )}

        {!isLoading && !error && !credits && (
           <div className="text-sm text-slate-500 italic">
             Click "Refresh" to fetch current EmailListVerify credit balance.
           </div>
        )}
      </CardContent>
    </Card>
  );
}
