'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, CheckSquare, MessageSquare, Users, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface Scenario {
  name: string;
  totalCount: number;
  positiveReplyCount: number;
  lastUpdated: string;
}

interface ScenarioResponse {
  scenarios: Scenario[];
  lastUpdated: string;
  fromCache?: boolean;
}

export default function PastScenariosPage() {
  const [data, setData] = React.useState<ScenarioResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { toast } = useToast();

  const fetchScenarios = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/scenarios/past${forceRefresh ? '?refresh=1' : ''}`);
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
  const totalContacts = data?.scenarios.reduce((sum, scenario) => sum + scenario.totalCount, 0) || 0;
  const totalResponses = data?.scenarios.reduce((sum, scenario) => sum + scenario.positiveReplyCount, 0) || 0;
  const responseRate = totalContacts > 0 ? (totalResponses / totalContacts) * 100 : 0;

  const formatLastUpdated = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Past Scenarios</h1>
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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Past Scenarios</h1>
          <p className="text-base text-gray-600">
            Track completed scenario performance
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
              <CardTitle className="text-lg font-medium opacity-90 flex items-center">
                <Users className="w-5 h-5 mr-2 opacity-80" />
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
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium opacity-90 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 opacity-80" />
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
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium opacity-90 flex items-center">
                <CheckSquare className="w-5 h-5 mr-2 opacity-80" />
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredScenarios.map((scenario) => (
          <motion.div
            key={scenario.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="hover:border-red-500 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckSquare className="w-5 h-5 text-red-500" />
                  {scenario.name}
                </CardTitle>
                {scenario.lastUpdated && (
                  <p className="text-sm text-gray-500">
                    Updated: {formatLastUpdated(scenario.lastUpdated)}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-red-500">
                    {scenario.totalCount.toLocaleString()}
                  </span>
                  <span className="text-gray-600">Total Contacts</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-red-500">
                    {scenario.positiveReplyCount.toLocaleString()}
                  </span>
                  <span className="text-gray-600">Responses</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-500 to-red-600"
                    style={{
                      width: `${(scenario.positiveReplyCount / scenario.totalCount) * 100}%`
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(scenario.positiveReplyCount / scenario.totalCount) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 