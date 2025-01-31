'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Search, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface Scenario {
  id: string;
  name: string;
  description: string | null;
  touchpointType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalContacts: number;
  responseCount: number;
}

interface ScenarioResponse {
  scenarios: Scenario[];
  lastUpdated: string;
  fromCache?: boolean;
}

const SCENARIO_COLORS = {
  primary: ['rgb(239, 68, 68)', 'rgb(220, 38, 38)'],
  secondary: ['#00a4bd', '#33b5c9'],
  tertiary: ['#516f90', '#7389a3']
};

export function ScenariosClient() {
  const [data, setData] = React.useState<ScenarioResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { toast } = useToast();

  const fetchScenarios = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/scenarios${forceRefresh ? '?refresh=1' : ''}`);
      if (!response.ok) throw new Error('Failed to fetch scenarios');
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      toast({
        title: 'Error',
        description: 'Failed to load scenarios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchScenarios();
  }, []);

  const filteredScenarios = React.useMemo(() => {
    if (!data?.scenarios || !searchQuery.trim()) return data?.scenarios || [];
    const query = searchQuery.toLowerCase();
    return data.scenarios.filter(scenario => 
      scenario.name.toLowerCase().includes(query)
    );
  }, [data?.scenarios, searchQuery]);

  // Calculate total metrics
  const totalContacts = data?.scenarios.reduce((sum, scenario) => sum + scenario.totalContacts, 0) || 0;
  const totalResponses = data?.scenarios.reduce((sum, scenario) => sum + scenario.responseCount, 0) || 0;
  const responseRate = totalContacts > 0 ? (totalResponses / totalContacts) * 100 : 0;

  const formatLastUpdated = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#33475b] mb-2">All Scenarios</h1>
            <p className="text-base text-gray-600">Loading scenario data...</p>
          </div>
          <Button disabled>
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="h-10 bg-gray-200 rounded w-2/3" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">All Scenarios</h1>
          <p className="text-base text-gray-600">
            Track and manage your email scenarios
          </p>
          {data?.lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {formatLastUpdated(data.lastUpdated)}
              {data.fromCache && ' (cached)'}
            </p>
          )}
        </div>
        <Button
          onClick={() => fetchScenarios(true)}
          className="bg-red-500 hover:bg-red-600 text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-slate-200 focus:border-red-500 focus:ring-red-100"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-white flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Total Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {totalContacts.toLocaleString()}
              </div>
              <p className="text-sm mt-2 opacity-80">Across all scenarios</p>
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
              <CardTitle className="text-lg font-semibold text-white flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Total Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {totalResponses.toLocaleString()}
              </div>
              <p className="text-sm mt-2 opacity-80">Positive replies received</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-[#516f90] to-[#7389a3] text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Response Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {responseRate.toFixed(1)}%
              </div>
              <p className="text-sm mt-2 opacity-80">Average response rate</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredScenarios.map((scenario) => (
          <Card key={scenario.name} className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">{scenario.name}</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Updated: {new Date(scenario.updatedAt).toLocaleString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Total Contacts</p>
                    <span className="text-2xl font-bold text-orange-500">
                      {scenario.totalContacts.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Responses</p>
                    <span className="text-2xl font-bold text-green-500">
                      {scenario.responseCount.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Response Rate</p>
                    <span className="text-2xl font-bold text-purple-500">
                      {((scenario.responseCount / scenario.totalContacts) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-400"
                      style={{
                        width: `${(scenario.responseCount / scenario.totalContacts) * 100}%`
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(scenario.responseCount / scenario.totalContacts) * 100}%` }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 