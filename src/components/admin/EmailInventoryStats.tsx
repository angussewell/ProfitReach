'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Loader2, Database } from 'lucide-react'; // Using Database icon for inventory
import { format } from 'date-fns';

interface EmailStats {
  available: number | null;
  inUse: number | null;
  total: number | null;
}

const N8N_WEBHOOK_URL = 'https://n8n.srv768302.hstgr.cloud/webhook/count-emails';
const FETCH_TIMEOUT = 15000; // 15 seconds

export function EmailInventoryStats() {
  const [statsData, setStatsData] = useState<EmailStats>({ available: null, inUse: null, total: null });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStatsData({ available: null, inUse: null, total: null }); // Reset on new fetch

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Send empty body as trigger
        signal: controller.signal,
      });

      clearTimeout(timeoutId); // Clear timeout if fetch completes

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const counts = await response.json(); // Directly assign the parsed JSON object

      // Validate response structure (expecting an object now)
      if (typeof counts !== 'object' || counts === null || Array.isArray(counts)) {
        console.error("Invalid API response structure: Expected an object, received:", counts);
        throw new Error("Received invalid data format from server.");
      }

      // Check for expected fields directly on the counts object
      if (counts.newAccountsCount === undefined || counts.totalNeonEmails === undefined || counts.totalMailReefEmails === undefined) {
         console.error("Missing expected fields in API response:", counts);
         throw new Error("Received incomplete data from server.");
      }

      setStatsData({
        available: counts.newAccountsCount,
        inUse: counts.totalNeonEmails,
        total: counts.totalMailReefEmails,
      });
      setLastUpdated(new Date());
      setError(null); // Clear any previous error

    } catch (err) {
      clearTimeout(timeoutId); // Ensure timeout is cleared on error too
      console.error("Failed to fetch email stats:", err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError("Failed to load data: Request timed out.");
      } else if (err instanceof Error) {
        setError(`Failed to load data: ${err.message}`);
      } else {
        setError("Failed to load data due to an unknown error.");
      }
      setStatsData({ available: null, inUse: null, total: null }); // Clear data on error
      setLastUpdated(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderStatValue = (value: number | null) => {
    if (isLoading) {
      return <Skeleton className="h-6 w-16 inline-block" />;
    }
    if (error) {
      return <span className="text-sm text-red-500">--</span>;
    }
    if (value === null) {
      return <span className="text-lg font-semibold text-slate-600">--</span>;
    }
    return <span className="text-2xl font-bold text-slate-900">{value}</span>;
  };

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
       <div className="h-1 bg-gradient-to-r from-teal-500 to-cyan-600"></div>
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center">
           <Database className="mr-2 h-4 w-4 text-cyan-600" />
           Email Account Inventory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-md border border-slate-100">
          <span className="text-sm font-medium text-slate-700">Available Emails (Ready for Use)</span>
          {renderStatValue(statsData.available)}
        </div>
        <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-md border border-slate-100">
          <span className="text-sm font-medium text-slate-700">Emails Currently In Use (Assigned)</span>
          {renderStatValue(statsData.inUse)}
        </div>
        <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-md border border-slate-100">
          <span className="text-sm font-medium text-slate-700">Total Purchased Emails (MailReef)</span>
          {renderStatValue(statsData.total)}
        </div>

        {error && (
          <div className="flex items-center text-sm text-red-600 p-2 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}
         {lastUpdated && !error && (
          <div className="flex items-center text-sm text-green-600 p-2 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="h-4 w-4 mr-2" />
            Stats loaded successfully.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start space-y-2 pt-4 border-t border-slate-100 bg-slate-50/30">
         <Button onClick={fetchStats} disabled={isLoading} size="sm">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Refresh Email Counts'
          )}
        </Button>
        {lastUpdated && !error && (
          <p className="text-xs text-slate-500">
            Last updated: {format(lastUpdated, 'Pp')}
          </p>
        )}
         {!lastUpdated && !error && !isLoading && (
           <p className="text-xs text-slate-500">Click button to load live data.</p>
         )}
      </CardFooter>
    </Card>
  );
}
