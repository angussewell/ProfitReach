'use client';

import { useEffect, useState } from 'react';
import { Users, MessageSquare, TrendingUp, BarChart } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface Scenario {
  id: string;
  name: string;
  type: string;
  totalContacts: number;
  responseCount: number;
  responseRate: number;
  updatedAt: string;
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const response = await fetch('/api/scenarios');
        if (!response.ok) throw new Error('Failed to fetch scenarios');
        const data = await response.json();
        
        // Calculate response rate for each scenario
        const scenariosWithRate = data.map((scenario: Omit<Scenario, 'responseRate'>) => ({
          ...scenario,
          responseRate: scenario.totalContacts > 0 
            ? (scenario.responseCount / scenario.totalContacts) * 100 
            : 0
        }));
        
        setScenarios(scenariosWithRate);
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

    fetchScenarios();
  }, [toast]);

  // Calculate overall metrics
  const totalContacts = scenarios.reduce((sum, scenario) => sum + scenario.totalContacts, 0);
  const totalResponses = scenarios.reduce((sum, scenario) => sum + scenario.responseCount, 0);
  const overallResponseRate = totalContacts > 0 ? (totalResponses / totalContacts) * 100 : 0;
  const averageResponseRate = scenarios.length > 0 
    ? scenarios.reduce((sum, scenario) => sum + scenario.responseRate, 0) / scenarios.length 
    : 0;

  const getMetricColor = (metric: 'contacts' | 'responses' | 'rate', value: number) => {
    switch(metric) {
      case 'contacts':
        if (value >= 1000) return 'text-blue-500';
        if (value >= 500) return 'text-blue-400';
        return 'text-blue-300';
      case 'responses':
        if (value >= 500) return 'text-green-500';
        if (value >= 100) return 'text-green-400';
        return 'text-green-300';
      case 'rate':
        if (value >= 50) return 'text-green-500';
        if (value >= 25) return 'text-yellow-500';
        return 'text-red-500';
      default:
        return 'text-slate-900';
    }
  };

  return (
    <PageContainer>
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-8 px-8 py-8 shadow-lg">
          <h1 className="text-3xl font-bold text-white mb-2">Scenario Analytics</h1>
          <p className="text-slate-300">Performance metrics across all scenarios</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 -mt-12">
          <Card className="border-2 border-slate-100 bg-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-lg font-semibold text-slate-800">Total Contacts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${getMetricColor('contacts', totalContacts)}`}>
                {totalContacts.toLocaleString()}
              </div>
              <div className="text-sm text-slate-500 mt-1">Across all scenarios</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-100 bg-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-500" />
                <CardTitle className="text-lg font-semibold text-slate-800">Total Responses</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${getMetricColor('responses', totalResponses)}`}>
                {totalResponses.toLocaleString()}
              </div>
              <div className="text-sm text-slate-500 mt-1">Response rate: {overallResponseRate.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-100 bg-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-5 h-5 ${getMetricColor('rate', averageResponseRate)}`} />
                <CardTitle className="text-lg font-semibold text-slate-800">Average Response Rate</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${getMetricColor('rate', averageResponseRate)}`}>
                {averageResponseRate.toFixed(1)}%
              </div>
              <div className="text-sm text-slate-500 mt-1">Mean across scenarios</div>
            </CardContent>
          </Card>
        </div>

        {/* Scenario Performance */}
        <div className="bg-slate-50 -mx-8 px-8 py-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-slate-400" />
            Scenario Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse border-2 border-slate-100 bg-white shadow-md hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="h-4 bg-slate-100 rounded w-1/2" />
                      <div className="h-4 bg-slate-100 rounded w-2/3" />
                      <div className="h-4 bg-slate-100 rounded w-1/3" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : scenarios.length === 0 ? (
              <Card className="col-span-3 p-6 text-center border-2 border-slate-100">
                <p className="text-slate-500">No scenarios found</p>
              </Card>
            ) : (
              scenarios.map((scenario) => (
                <Card
                  key={scenario.id}
                  className="border-2 border-slate-100 bg-white shadow-md hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden"
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-slate-800">
                      {scenario.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-slate-500">Total Contacts</div>
                        <div className={`text-lg font-semibold ${getMetricColor('contacts', scenario.totalContacts)}`}>
                          {scenario.totalContacts.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-500">Responses</div>
                        <div className={`text-lg font-semibold ${getMetricColor('responses', scenario.responseCount)}`}>
                          {scenario.responseCount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-500">Response Rate</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getMetricColor('rate', scenario.responseRate)}`}
                              style={{
                                width: `${scenario.responseRate}%`,
                              }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${getMetricColor('rate', scenario.responseRate)}`}>
                            {scenario.responseRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
} 