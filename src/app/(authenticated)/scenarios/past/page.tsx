'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, CheckSquare, MessageSquare, Users, Search, Clock, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface Scenario {
  id: string;
  name: string;
  totalContacts: number;
  activeContacts: number;
  responseCount: number;
  manualRepliesCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface ScenarioResponse {
  scenarios: Scenario[];
  lastUpdated: string;
  fromCache?: boolean;
}

export default function PastScenariosPage() {
  const [scenarios, setScenarios] = React.useState<Scenario[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = React.useState('');
  const { toast } = useToast();

  const fetchScenarios = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/scenarios/analytics${forceRefresh ? '?refresh=1' : ''}`);
      if (!response.ok) throw new Error('Failed to fetch scenarios');
      const data = await response.json();
      setScenarios(data);
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
    if (!scenarios || !searchQuery.trim()) return scenarios;
    const query = searchQuery.toLowerCase();
    return scenarios.filter(scenario => 
      scenario.name.toLowerCase().includes(query)
    );
  }, [scenarios, searchQuery]);

  // Calculate total metrics
  const totalContacts = scenarios.reduce((sum, scenario) => sum + scenario.totalContacts, 0);
  const totalResponses = scenarios.reduce((sum, scenario) => sum + scenario.responseCount, 0);
  const responseRate = totalContacts > 0 ? (totalResponses / totalContacts) * 100 : 0;

  const formatLastUpdated = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Function to add a manual reply
  const addManualReply = async (scenarioId: string) => {
    setActionLoading(prev => ({ ...prev, [scenarioId]: true }));
    try {
      const response = await fetch('/api/scenarios/manual-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioId,
          action: 'add'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add reply');
      }

      // Update the local state to reflect the change
      setScenarios(prevScenarios => 
        prevScenarios.map(scenario => 
          scenario.id === scenarioId 
            ? { 
                ...scenario, 
                responseCount: scenario.responseCount + 1,
                manualRepliesCount: (scenario.manualRepliesCount || 0) + 1
              } 
            : scenario
        )
      );

      toast({
        title: 'Success',
        description: 'Reply added successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error adding reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to add reply',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [scenarioId]: false }));
    }
  };

  // Function to remove a manual reply
  const removeManualReply = async (scenarioId: string) => {
    setActionLoading(prev => ({ ...prev, [scenarioId]: true }));
    try {
      const response = await fetch('/api/scenarios/manual-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioId,
          action: 'remove'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove reply');
      }

      // Update the local state to reflect the change
      setScenarios(prevScenarios => 
        prevScenarios.map(scenario => 
          scenario.id === scenarioId && scenario.responseCount > 0
            ? { 
                ...scenario, 
                responseCount: scenario.responseCount - 1,
                manualRepliesCount: Math.max((scenario.manualRepliesCount || 0) - 1, 0)
              } 
            : scenario
        )
      );

      toast({
        title: 'Success',
        description: 'Reply removed successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error removing reply:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove reply',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [scenarioId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="technical-header mb-2">Past Scenarios</h1>
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
          <h1 className="technical-header mb-2">Past Scenarios</h1>
          <p className="technical-subheader">
            Track completed scenario performance
          </p>
          {scenarios.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {formatLastUpdated(scenarios[0].updatedAt)}
            </p>
          )}
        </div>
        <Button
          onClick={() => fetchScenarios(true)}
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
                <Clock className="w-5 h-5 opacity-80" />
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
        {filteredScenarios.map((scenario) => (
          <motion.div
            key={scenario.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="technical-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-primary" />
                  {scenario.name}
                </CardTitle>
                {scenario.updatedAt && (
                  <p className="technical-subheader">
                    Updated: {formatLastUpdated(scenario.updatedAt)}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="technical-value">
                    {scenario.totalContacts.toLocaleString()}
                  </span>
                  <span className="technical-label">Total Contacts</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="technical-value">
                    {scenario.responseCount.toLocaleString()}
                  </span>
                  <span className="technical-label">
                    Responses
                  </span>
                </div>
                <div className="technical-progress">
                  <motion.div
                    className="technical-progress-fill"
                    style={{
                      width: `${(scenario.responseCount / scenario.totalContacts) * 100 || 0}%`
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(scenario.responseCount / scenario.totalContacts) * 100 || 0}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-6">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeManualReply(scenario.id)}
                    disabled={actionLoading[scenario.id] || (scenario.manualRepliesCount || 0) === 0}
                    className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => addManualReply(scenario.id)}
                    disabled={actionLoading[scenario.id]}
                    className="h-8 w-8 rounded-full hover:bg-green-50 hover:text-green-500 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 