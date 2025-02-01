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
}

interface ScenarioAnalytics {
  id: string;
  name: string;
  totalContacts: number;
  activeContacts: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
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
  const [scenarios, setScenarios] = React.useState<Scenario[]>([]);
  const [analytics, setAnalytics] = React.useState<ScenarioAnalytics[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { toast } = useToast();

  const fetchData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      // Fetch scenarios
      const scenariosResponse = await fetch(`/api/scenarios${forceRefresh ? '?refresh=1' : ''}`);
      if (!scenariosResponse.ok) throw new Error('Failed to fetch scenarios');
      const scenariosData = await scenariosResponse.json();
      setScenarios(scenariosData);

      // Fetch analytics
      const analyticsResponse = await fetch(`/api/scenarios/analytics${forceRefresh ? '?refresh=1' : ''}`);
      if (!analyticsResponse.ok) throw new Error('Failed to fetch analytics');
      const analyticsData = await analyticsResponse.json();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching data:', error);
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
    fetchData();
  }, []);

  const filteredScenarios = React.useMemo(() => {
    if (!scenarios || !searchQuery.trim()) return scenarios;
    const query = searchQuery.toLowerCase();
    return scenarios.filter(scenario => 
      scenario.name.toLowerCase().includes(query)
    );
  }, [scenarios, searchQuery]);

  // Calculate total metrics from analytics
  const totalContacts = analytics.reduce((sum, scenario) => sum + scenario.totalContacts, 0);
  const totalResponses = analytics.reduce((sum, scenario) => sum + scenario.responseCount, 0);
  const responseRate = totalContacts > 0 ? (totalResponses / totalContacts) * 100 : 0;

  const formatLastUpdated = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="technical-header mb-2">All Scenarios</h1>
            <p className="technical-subheader">Loading scenario data...</p>
          </div>
          <Button disabled variant="default">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </Button>
        </div>
        <div className="technical-grid">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="technical-card animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="h-10 bg-muted rounded w-2/3" />
                  <div className="h-8 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-1/2" />
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
          <h1 className="technical-header mb-2">All Scenarios</h1>
          <p className="technical-subheader">
            Track and manage your email scenarios
          </p>
          {analytics.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {formatLastUpdated(analytics[0].updatedAt)}
              {analytics.length > 1 && ' (cached)'}
            </p>
          )}
        </div>
        <Button
          onClick={() => fetchData(true)}
          variant="default"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="technical-grid mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="technical-card-accent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 opacity-80" />
                Total Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="technical-value">
                {totalContacts.toLocaleString()}
              </div>
              <p className="technical-label mt-2">Across all scenarios</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="technical-card-accent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 opacity-80" />
                Total Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="technical-value">
                {totalResponses.toLocaleString()}
              </div>
              <p className="technical-label mt-2">Positive replies received</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="technical-card-accent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 opacity-80" />
                Response Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="technical-value">
                {responseRate.toFixed(1)}%
              </div>
              <p className="technical-label mt-2">Average response rate</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="technical-grid">
        {filteredScenarios.map((scenario) => {
          const scenarioAnalytics = analytics.find(a => a.id === scenario.id) || {
            totalContacts: 0,
            responseCount: 0
          };
          
          return (
            <Card key={scenario.name} className="technical-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="technical-header">{scenario.name}</CardTitle>
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <p className="technical-subheader">
                  Updated: {new Date(scenario.updatedAt).toLocaleString()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="technical-label">Total Contacts</p>
                      <span className="technical-value">
                        {scenarioAnalytics.totalContacts.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="technical-label">Responses</p>
                      <span className="technical-value">
                        {scenarioAnalytics.responseCount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="technical-label">Response Rate</p>
                      <span className="technical-value">
                        {((scenarioAnalytics.responseCount / scenarioAnalytics.totalContacts) * 100 || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="technical-progress mt-2">
                      <motion.div
                        className="technical-progress-fill"
                        style={{
                          width: `${(scenarioAnalytics.responseCount / scenarioAnalytics.totalContacts) * 100 || 0}%`
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(scenarioAnalytics.responseCount / scenarioAnalytics.totalContacts) * 100 || 0}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 