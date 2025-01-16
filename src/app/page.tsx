'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, Users, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Stage {
  name: string;
  id: string;
  count: number;
  percentage: number;
  error?: boolean;
}

interface PipelineData {
  stages: Stage[];
  total: number;
  lastUpdated: string;
  error?: string;
}

export default function Dashboard() {
  const [data, setData] = React.useState<PipelineData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPipeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/hubspot/companies/pipeline');
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to fetch pipeline data');
        return;
      }
      
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching pipeline:', error);
      setError('Failed to fetch pipeline data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPipeline();
  }, []);

  // Calculate metrics
  const totalPipeline = data?.total || 0;
  const customerCount = data?.stages.find(s => s.id === 'customer')?.count || 0;
  const conversionRate = totalPipeline > 0 ? (customerCount / totalPipeline) * 100 : 0;
  const opportunityCount = data?.stages.find(s => s.id === '39710605')?.count || 0;

  // Companies at risk are those in Stale or Abandoned stages
  const atRiskCount = data?.stages.reduce((sum, stage) => {
    if (['39786496', '42495546'].includes(stage.id)) {
      return sum + stage.count;
    }
    return sum;
  }, 0) || 0;

  const formatLastUpdated = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold">Sales Pipeline</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPipeline()}
            className="text-gray-600"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Pipeline</CardTitle>
              <CardDescription>Total companies in pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {loading ? (
                  <span>-</span>
                ) : (
                  totalPipeline.toLocaleString()
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversion Rate</CardTitle>
              <CardDescription>Companies converted to customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {loading ? (
                  <span>-</span>
                ) : (
                  `${conversionRate.toFixed(1)}%`
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Opportunities</CardTitle>
              <CardDescription>Active opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {loading ? (
                  <span>-</span>
                ) : (
                  opportunityCount.toLocaleString()
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Pipeline */}
        <Card className="glass-effect overflow-hidden border-0">
          <CardHeader className="border-b bg-card/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Pipeline Stages</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Last updated: {formatLastUpdated(data?.lastUpdated)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hubspot-orange"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12 glass-effect rounded-lg">
                <p className="text-red-500">{error}</p>
                <button
                  onClick={fetchPipeline}
                  className="mt-4 text-hubspot-orange hover:text-hubspot-dark-orange transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {data?.stages.map((stage) => (
                  <div key={stage.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{stage.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {stage.count} {stage.count === 1 ? 'company' : 'companies'}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {stage.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 ease-in-out bg-gradient-to-r from-hubspot-orange to-hubspot-dark-orange"
                        style={{ width: `${stage.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
