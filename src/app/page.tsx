'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, Users, RefreshCw, Loader2, BarChart3, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface Stage {
  name: string;
  id: string;
  count: number;
  percentage: number;
}

interface PipelineData {
  stages: Stage[];
  total: number;
  lastUpdated: string;
  error?: string;
}

type StageId = 'marketingqualifiedlead' | '205174134' | '39710605' | '205609479' | 'customer' | '39786496' | '42495546' | 'abandoned';

const STAGE_COLORS: Record<StageId, [string, string]> = {
  'marketingqualifiedlead': ['#ff7a59', '#ff957a'], // Orange
  '205174134': ['#00a4bd', '#33b5c9'], // Blue
  '39710605': ['#516f90', '#7389a3'], // Navy
  '205609479': ['#6da7c0', '#88b8cc'], // Light Blue
  'customer': ['#00bda5', '#33cbb8'], // Teal
  '39786496': ['#f2545b', '#f57a80'], // Red
  '42495546': ['#8b8b8b', '#a3a3a3'], // Gray
  'abandoned': ['#c7c7c7', '#d9d9d9'] // Light Gray
};

export default function Dashboard() {
  const [data, setData] = React.useState<PipelineData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPipelineData = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        setLoading(true);
      }
      setIsRefreshing(forceRefresh);
      
      const response = await fetch('/api/hubspot/companies/pipeline' + (forceRefresh ? '?refresh=1' : ''));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pipeline data: ${response.statusText}`);
      }

      const newData = await response.json();
      
      if (!newData.stages || !Array.isArray(newData.stages)) {
        throw new Error('Invalid pipeline data format');
      }

      setData(newData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching pipeline data:', err);
      setError(err.message || 'Failed to fetch pipeline data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchPipelineData(true);
  }, [fetchPipelineData]);

  useEffect(() => {
    fetchPipelineData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchPipelineData();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchPipelineData]);

  // Calculate metrics
  const totalPipeline = data?.total || 0;
  const customerCount = data?.stages.find(s => s.id === 'customer')?.count || 0;
  const conversionRate = totalPipeline > 0 ? (customerCount / totalPipeline) * 100 : 0;
  const opportunityCount = data?.stages.find(s => s.id === '39710605')?.count || 0;

  const formatLastUpdated = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#33475b]">Sales Pipeline</h1>
            <p className="text-gray-600 mt-2">
              Last updated: {formatLastUpdated(data?.lastUpdated)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="text-gray-600 hover:text-[#ff7a59] hover:border-[#ff7a59] transition-colors"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-[#ff7a59] to-[#ff957a] text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium opacity-90">Total Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {loading ? (
                    <span>-</span>
                  ) : (
                    totalPipeline.toLocaleString()
                  )}
                </div>
                <p className="text-sm mt-2 opacity-80">Total companies in pipeline</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-[#00a4bd] to-[#33b5c9] text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium opacity-90">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {loading ? (
                    <span>-</span>
                  ) : (
                    `${conversionRate.toFixed(1)}%`
                  )}
                </div>
                <p className="text-sm mt-2 opacity-80">Companies converted to customers</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-[#00bda5] to-[#33cbb8] text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium opacity-90">Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {loading ? (
                    <span>-</span>
                  ) : (
                    opportunityCount.toLocaleString()
                  )}
                </div>
                <p className="text-sm mt-2 opacity-80">Active opportunities</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sales Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="backdrop-blur-sm bg-white/90 shadow-xl border-0">
            <CardHeader className="border-b bg-card/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-[#33475b]">Pipeline Stages</CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Distribution of companies across stages
                  </CardDescription>
                </div>
                <BarChart3 className="w-5 h-5 text-[#ff7a59]" />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#ff7a59]" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-500">{error}</p>
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    className="mt-4 text-[#ff7a59] hover:text-[#ff957a] transition-colors"
                    disabled={isRefreshing}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {data?.stages.map((stage) => (
                    <motion.div
                      key={stage.id}
                      className="space-y-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm text-[#33475b]">{stage.name}</h4>
                          <p className="text-xs text-gray-500">
                            {stage.count} {stage.count === 1 ? 'company' : 'companies'}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-[#516f90]">
                          {stage.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full transition-all duration-500 ease-in-out"
                          style={{
                            background: `linear-gradient(to right, ${STAGE_COLORS[stage.id as StageId][0]}, ${STAGE_COLORS[stage.id as StageId][1]})`,
                            width: `${stage.percentage}%`
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${stage.percentage}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}