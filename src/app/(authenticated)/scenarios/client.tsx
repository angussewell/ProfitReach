'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Users, MessageSquare, TrendingUp, BarChart } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { DateRangeFilter } from '@/components/filters/date-range-filter';
import { HTMLAttributes, SVGProps } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Dynamic imports
const ClientImage = dynamic(() => import('next/image'), { ssr: false });

// Create client-side components
const ClientCard = Card as React.ComponentType<HTMLAttributes<HTMLDivElement>>;
const ClientCardHeader = CardHeader as React.ComponentType<HTMLAttributes<HTMLDivElement>>;
const ClientCardTitle = CardTitle as React.ComponentType<HTMLAttributes<HTMLHeadingElement>>;
const ClientCardContent = CardContent as React.ComponentType<HTMLAttributes<HTMLDivElement>>;

// Create client-side icons
const ClientUsers = Users as unknown as React.ComponentType<SVGProps<SVGSVGElement>>;
const ClientMessageSquare = MessageSquare as unknown as React.ComponentType<SVGProps<SVGSVGElement>>;
const ClientTrendingUp = TrendingUp as unknown as React.ComponentType<SVGProps<SVGSVGElement>>;
const ClientBarChart = BarChart as unknown as React.ComponentType<SVGProps<SVGSVGElement>>;

// Create client-side motion component
const ClientMotionDiv = motion.div as unknown as React.ComponentType<HTMLAttributes<HTMLDivElement> & { initial?: any; animate?: any; transition?: any }>;

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
  touchpointType: string;
  totalContacts: number;
  activeContacts: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DateRange {
  from: Date;
  to: Date;
}

const getTypeConfig = (type: string | undefined) => {
  const normalizedType = (type || '').toLowerCase();
  
  switch (normalizedType) {
    case 'linkedin':
      return {
        icon: '/LinkedIn_icon.svg.png',
        bgColor: 'bg-[#0A66C2]/5',
        accentColor: 'border-[#0A66C2]/20',
        iconBg: 'bg-[#0A66C2]',
        hoverBg: 'hover:bg-[#0A66C2]/10',
        progressColor: 'from-[#0A66C2] to-[#0A66C2]/80',
        label: 'LinkedIn'
      };
    case 'research':
      return {
        icon: '/Perplexity-logo.png',
        bgColor: 'bg-[#0A66C2]/5',
        accentColor: 'border-[#0A66C2]/20',
        iconBg: 'bg-[#0A66C2]',
        hoverBg: 'hover:bg-[#0A66C2]/10',
        progressColor: 'from-[#0A66C2] to-[#0A66C2]/80',
        label: 'Research'
      };
    case 'email':
      return {
        icon: '/Gmail_icon_(2020).svg.webp',
        bgColor: 'bg-[#EA4335]/5',
        accentColor: 'border-[#EA4335]/20',
        iconBg: 'bg-[#EA4335]',
        hoverBg: 'hover:bg-[#EA4335]/10',
        progressColor: 'from-[#EA4335] to-[#EA4335]/80',
        label: 'Email'
      };
    case 'googledrive':
      return {
        icon: '/google drive logo.webp',
        bgColor: 'bg-[#1FA463]/5',
        accentColor: 'border-[#1FA463]/20',
        iconBg: 'bg-[#1FA463]',
        hoverBg: 'hover:bg-[#1FA463]/10',
        progressColor: 'from-[#1FA463] to-[#1FA463]/80',
        label: 'Google Drive'
      };
    default:
      return {
        icon: '/Gmail_icon_(2020).svg.webp',
        bgColor: 'bg-gray-50',
        accentColor: 'border-gray-200',
        iconBg: 'bg-gray-100',
        hoverBg: 'hover:bg-gray-100',
        progressColor: 'from-gray-500 to-gray-400',
        label: type || 'Unknown'
      };
  }
};

export function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [analytics, setAnalytics] = useState<ScenarioAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      // Build URL with date range parameters
      const url = new URL('/api/scenarios/analytics', window.location.origin);
      if (dateRange) {
        url.searchParams.set('from', dateRange.from.toISOString());
        url.searchParams.set('to', dateRange.to.toISOString());
      }

      // Fetch analytics with date range filter
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch scenario analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch scenario data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [dateRange]);

  // Calculate metrics using useMemo to prevent unnecessary recalculations
  const {
    outboundScenarios,
    totalContacts,
    totalResponses,
    overallResponseRate,
    averageResponseRate
  } = useMemo(() => {
    if (loading || !analytics.length) {
      return {
        outboundScenarios: [],
        totalContacts: 0,
        totalResponses: 0,
        overallResponseRate: 0,
        averageResponseRate: 0
      };
    }

    // No need to filter since API already filters out research scenarios
    const outboundScenarios = analytics;

    const totalContacts = outboundScenarios.reduce((sum, scenario) => 
      sum + (scenario.totalContacts || 0), 0);

    const totalResponses = outboundScenarios.reduce((sum, scenario) => 
      sum + (scenario.responseCount || 0), 0);

    const overallResponseRate = totalContacts > 0 
      ? (totalResponses / totalContacts) * 100 
      : 0;

    const averageResponseRate = outboundScenarios.length > 0
      ? outboundScenarios.reduce((sum, scenario) => {
          const rate = scenario.totalContacts > 0
            ? ((scenario.responseCount || 0) / scenario.totalContacts) * 100
            : 0;
          return sum + rate;
        }, 0) / outboundScenarios.length
      : 0;

    return {
      outboundScenarios,
      totalContacts,
      totalResponses,
      overallResponseRate,
      averageResponseRate
    };
  }, [analytics, loading]);

  const getMetricColor = (type: string, value: number) => {
    if (type === 'contacts' && value > 1000) return 'text-blue-500';
    if (type === 'responses' && value > 100) return 'text-green-500';
    if (type === 'rate' && value > 20) return 'text-yellow-500';
    return 'text-slate-800';
  };

  // Add this function to calculate the contact progress
  const getContactProgress = (value: number) => {
    // You can adjust these thresholds based on your needs
    const target = 1000; // Example target
    return Math.min((value / target) * 100, 100);
  };

  const renderScenarioCard = (scenario: ScenarioAnalytics, index: number) => {
    if (!scenario) return null;
    
    const isResearch = scenario.touchpointType && scenario.touchpointType.toLowerCase() === 'research';
    const responseRate = !isResearch && scenario.totalContacts > 0
      ? ((scenario.responseCount || 0) / scenario.totalContacts) * 100
      : 0;
    const config = getTypeConfig(scenario.touchpointType);

    return (
      <ClientMotionDiv
        key={scenario.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: index * 0.1 }}
      >
        <ClientCard 
          className={cn(
            "group border border-slate-200/50 bg-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden",
            config.bgColor,
            config.accentColor,
            config.hoverBg
          )}
        >
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#ff7a59]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <ClientCardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-xl p-2', config.iconBg, 'bg-opacity-10')}>
                <img
                  src={config.icon}
                  alt={`${config.label} icon`}
                  className="w-8 h-8 aspect-square object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <ClientCardTitle className="text-lg font-semibold text-slate-800">
                  {scenario.name || 'Unnamed Scenario'}
                </ClientCardTitle>
                <p className="text-sm text-slate-500">{config.label}</p>
              </div>
            </div>
          </ClientCardHeader>
          <ClientCardContent>
            <div className="space-y-6">
              <div>
                <div className="text-sm text-slate-500">
                  {isResearch ? 'Contacts Researched' : 'Total Contacts'}
                </div>
                <div className="text-2xl font-bold text-slate-800 [text-shadow:_0_1px_2px_rgb(0_0_0_/_5%)]">
                  {(scenario.totalContacts || 0).toLocaleString()}
                </div>
              </div>
              {!isResearch && (
                <>
                  <div>
                    <div className="text-sm text-slate-500">Total Responses</div>
                    <div className="text-2xl font-bold text-green-600 [text-shadow:_0_1px_2px_rgb(0_0_0_/_5%)]">
                      {(scenario.responseCount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-500">Response Rate</div>
                      <div className="text-sm font-medium text-[#ff7a59]">
                        {responseRate.toFixed(1)}%
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                      <div 
                        className={cn(
                          "h-full bg-gradient-to-r rounded-full transition-all duration-500 shadow-sm",
                          config.progressColor
                        )}
                        style={{ width: `${Math.min(responseRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </ClientCardContent>
        </ClientCard>
      </ClientMotionDiv>
    );
  };

  return (
    <PageContainer>
      <div className="space-y-8">
        {/* Enhanced Header Section */}
        <div className="relative -mx-8 px-8 py-6 bg-gradient-to-br from-[#ff7a59] via-[#ff4d4d] to-[#ff7a59]/90 rounded-3xl shadow-lg">
          <div className="absolute inset-0 bg-white/5 rounded-3xl backdrop-blur-[1px]" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_10%)]">
                Scenarios Dashboard
              </h1>
              <p className="text-white/90">Track your automation performance</p>
            </div>
            <DateRangeFilter onRangeChange={setDateRange} />
          </div>
        </div>

        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 -mt-12">
          <ClientMotionDiv
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <ClientCard className="relative border border-slate-200/50 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group h-[164px]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
              <ClientCardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-xl shadow-sm">
                    <ClientUsers className="w-5 h-5 text-blue-500" />
                  </div>
                  <ClientCardTitle className="text-lg font-semibold text-slate-800">Total Outbound Runs</ClientCardTitle>
                </div>
              </ClientCardHeader>
              <ClientCardContent>
                <div className={`text-4xl font-bold ${getMetricColor('contacts', totalContacts)} [text-shadow:_0_1px_2px_rgb(0_0_0_/_5%)]`}>
                  {totalContacts.toLocaleString()}
                </div>
                <div className="text-sm text-slate-500 mt-1">Total scenario executions</div>
                <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${getContactProgress(totalContacts)}%` }}
                  />
                </div>
              </ClientCardContent>
            </ClientCard>
          </ClientMotionDiv>

          <ClientMotionDiv
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <ClientCard className="relative border border-slate-200/50 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group h-[164px]">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-green-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
              <ClientCardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-xl shadow-sm">
                    <ClientMessageSquare className="w-5 h-5 text-green-500" />
                  </div>
                  <ClientCardTitle className="text-lg font-semibold text-slate-800">Total Responses</ClientCardTitle>
                </div>
              </ClientCardHeader>
              <ClientCardContent>
                <div className={`text-4xl font-bold ${getMetricColor('responses', totalResponses)} [text-shadow:_0_1px_2px_rgb(0_0_0_/_5%)]`}>
                  {totalResponses.toLocaleString()}
                </div>
                <div className="text-sm text-slate-500 mt-1">Positive responses received</div>
                <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${Math.min(overallResponseRate, 100)}%` }}
                  />
                </div>
              </ClientCardContent>
            </ClientCard>
          </ClientMotionDiv>

          <ClientMotionDiv
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <ClientCard className="relative border border-slate-200/50 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group h-[164px]">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-yellow-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
              <ClientCardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-100 rounded-xl shadow-sm">
                    <ClientTrendingUp className={`w-5 h-5 ${getMetricColor('rate', averageResponseRate)}`} />
                  </div>
                  <ClientCardTitle className="text-lg font-semibold text-slate-800">Average Response Rate</ClientCardTitle>
                </div>
              </ClientCardHeader>
              <ClientCardContent>
                <div className={`text-4xl font-bold ${getMetricColor('rate', averageResponseRate)} [text-shadow:_0_1px_2px_rgb(0_0_0_/_5%)]`}>
                  {averageResponseRate.toFixed(1)}%
                </div>
                <div className="text-sm text-slate-500 mt-1">Across outbound scenarios</div>
                <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${Math.min(averageResponseRate, 100)}%` }}
                  />
                </div>
              </ClientCardContent>
            </ClientCard>
          </ClientMotionDiv>
        </div>

        {/* Enhanced Scenario Performance */}
        <div className="relative bg-gradient-to-b from-slate-50 to-white -mx-8 px-8 py-8 rounded-3xl shadow-inner">
          <div className="absolute inset-0 bg-white/50 rounded-3xl backdrop-blur-[1px]" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#ff7a59]/10 rounded-xl shadow-sm">
                  <ClientBarChart className="w-5 h-5 text-[#ff7a59]" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800 [text-shadow:_0_1px_2px_rgb(0_0_0_/_5%)]">
                  Scenario Performance
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <ClientMotionDiv
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: i * 0.1 }}
                  >
                    <ClientCard className="animate-pulse border border-slate-200/50 bg-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl overflow-hidden">
                      <ClientCardHeader className="pb-4">
                        <div className="h-6 bg-slate-200 rounded w-3/4" />
                      </ClientCardHeader>
                      <ClientCardContent>
                <div className="space-y-4">
                          <div className="h-4 bg-slate-100 rounded w-1/2" />
                          <div className="h-4 bg-slate-100 rounded w-2/3" />
                          <div className="h-4 bg-slate-100 rounded w-1/3" />
                        </div>
                      </ClientCardContent>
                    </ClientCard>
                  </ClientMotionDiv>
                ))
              ) : analytics.length === 0 ? (
                <ClientCard className="col-span-3 p-8 text-center border border-slate-200/50 bg-white/50 backdrop-blur-sm rounded-xl">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-slate-100 rounded-full shadow-sm">
                      <ClientBarChart className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500">No scenarios found</p>
                  </div>
                </ClientCard>
              ) : (
                analytics.map((scenario, index) => renderScenarioCard(scenario, index))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
} 