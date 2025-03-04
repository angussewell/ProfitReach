'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Users, MessageSquare, TrendingUp, BarChart, Plus, Minus, Calendar } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { DateRangeFilter } from '@/components/filters/date-range-filter';
import { HTMLAttributes, SVGProps, ComponentProps } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Dynamic imports
const ClientImage = dynamic(() => import('next/image'), { ssr: false });

// Create client-side components
const ClientCard = Card as unknown as React.ComponentType<HTMLAttributes<HTMLDivElement>>;
const ClientCardHeader = CardHeader as unknown as React.ComponentType<HTMLAttributes<HTMLDivElement>>;
const ClientCardTitle = CardTitle as unknown as React.ComponentType<HTMLAttributes<HTMLHeadingElement>>;
const ClientCardContent = CardContent as unknown as React.ComponentType<HTMLAttributes<HTMLDivElement>>;
const ClientCardFooter = CardFooter as unknown as React.ComponentType<HTMLAttributes<HTMLDivElement>>;
const ClientButton = Button as unknown as React.ComponentType<ComponentProps<typeof Button>>;
const ClientDialog = Dialog as unknown as React.ComponentType<ComponentProps<typeof Dialog>>;
const ClientDialogContent = DialogContent as unknown as React.ComponentType<ComponentProps<typeof DialogContent>>;
const ClientDialogHeader = DialogHeader as unknown as React.ComponentType<HTMLAttributes<HTMLDivElement>>;
const ClientDialogTitle = DialogTitle as unknown as React.ComponentType<ComponentProps<typeof DialogTitle>>;
const ClientDialogDescription = DialogDescription as unknown as React.ComponentType<ComponentProps<typeof DialogDescription>>;
const ClientDialogFooter = DialogFooter as unknown as React.ComponentType<HTMLAttributes<HTMLDivElement>>;
const ClientTextarea = Textarea as unknown as React.ComponentType<ComponentProps<typeof Textarea>>;
const ClientLabel = Label as unknown as React.ComponentType<ComponentProps<typeof Label>>;

// Create client-side icons
const ClientUsers = Users as unknown as React.ComponentType<SVGProps<SVGSVGElement>>;
const ClientMessageSquare = MessageSquare as unknown as React.ComponentType<SVGProps<SVGSVGElement>>;
const ClientTrendingUp = TrendingUp as unknown as React.ComponentType<SVGProps<SVGSVGElement>>;
const ClientBarChart = BarChart as unknown as React.ComponentType<SVGProps<SVGSVGElement>>;
const ClientPlus = Plus as unknown as React.ComponentType<SVGProps<SVGSVGElement>>;
const ClientMinus = Minus as unknown as React.ComponentType<SVGProps<SVGSVGElement>>;
const ClientCalendar = Calendar as unknown as React.ComponentType<SVGProps<SVGSVGElement>>;

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
  manualRepliesCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface AnalyticsResponse {
  scenarios: ScenarioAnalytics[];
  appointmentsCount: number;
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
  const [scenarios, setScenarios] = useState<ScenarioAnalytics[]>([]);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const { toast } = useToast();
  const [researchContactsCount, setResearchContactsCount] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Build URL with date range parameters
      const url = new URL('/api/scenarios/analytics', window.location.origin);
      if (dateRange) {
        url.searchParams.set('from', dateRange.from.toISOString());
        url.searchParams.set('to', dateRange.to.toISOString());
      }
      
      // Fetch scenarios from the API
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch scenarios: ${response.statusText}`);
      }
      
      const data: AnalyticsResponse = await response.json();
      setScenarios(data.scenarios);
      setAppointmentsCount(data.appointmentsCount);
      
      // Fetch research contacts count
      try {
        if (dateRange) {
          const researchUrl = new URL('/api/webhooks/research-count', window.location.origin);
          researchUrl.searchParams.set('from', dateRange.from.toISOString());
          researchUrl.searchParams.set('to', dateRange.to.toISOString());
          
          const researchResponse = await fetch(researchUrl);
          
          if (researchResponse.ok) {
            const researchData = await researchResponse.json();
            setResearchContactsCount(researchData.count || 0);
          } else {
            console.error('Failed to fetch research contacts count:', researchResponse.statusText);
          }
        }
      } catch (researchError) {
        console.error('Error fetching research contacts count:', researchError);
      }
      
    } catch (error) {
      console.error('Error fetching scenarios:', error);
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

  // Helper function to infer type from scenario name when touchpointType is undefined
  const inferTypeFromName = (name: string): string => {
    const normalizedName = (name || '').toLowerCase().trim();
    if (normalizedName.includes('research')) {
      return 'research';
    } else if (normalizedName.includes('email') || 
               normalizedName.includes('outreach') || 
               normalizedName.includes('follow up')) {
      return 'email';
    }
    return 'unknown';
  };

  // Calculate metrics using useMemo to prevent unnecessary recalculations
  const {
    totalResponses,
    averageResponseRate
  } = useMemo(() => {
    if (loading || !scenarios.length) {
      return {
        totalResponses: 0,
        averageResponseRate: 0
      };
    }

    // Calculate total responses from all scenarios
    const totalResponses = scenarios.reduce((sum, scenario) => 
      sum + (scenario.responseCount || 0), 0);

    // Calculate average response rate across all scenarios
    const averageResponseRate = scenarios.length > 0
      ? scenarios.reduce((sum, scenario) => {
          const rate = scenario.totalContacts > 0
            ? ((scenario.responseCount || 0) / scenario.totalContacts) * 100
            : 0;
          return sum + rate;
        }, 0) / scenarios.length
      : 0;

    return {
      totalResponses,
      averageResponseRate
    };
  }, [scenarios, loading]);

  // Calculate response rate for research scenarios
  const overallResponseRate = useMemo(() => {
    if (researchContactsCount <= 0) return 0;
    
    // Total responses from all scenarios
    const responses = scenarios.reduce((sum, scenario) =>
      sum + (scenario.responseCount || 0), 0);
    
    return (responses / researchContactsCount) * 100;
  }, [scenarios, researchContactsCount]);

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

  // Add appointment function
  const addAppointment = async (notes?: string) => {
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to add appointment');
      }

      // Refresh data to update counts
      await fetchData();

      toast({
        title: 'Success',
        description: 'Appointment added successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error adding appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add appointment',
        variant: 'destructive',
      });
    }
  };

  // Delete appointment function
  const deleteAppointment = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete appointment');
      }

      // Refresh data to update counts
      await fetchData();

      toast({
        title: 'Success',
        description: 'Appointment deleted successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete appointment',
        variant: 'destructive',
      });
    }
  };

  const renderScenarioCard = (scenario: ScenarioAnalytics, index: number) => {
    if (!scenario) return null;
    
    // Infer the type if touchpointType is undefined
    const effectiveType = scenario.touchpointType || inferTypeFromName(scenario.name);
    const typeConfig = getTypeConfig(effectiveType);
    const isResearch = effectiveType === 'research';
    const responseRate = !isResearch && scenario.totalContacts > 0
      ? ((scenario.responseCount || 0) / scenario.totalContacts) * 100
      : 0;
    const isLoading = actionLoading[scenario.id] || false;

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
            typeConfig.bgColor,
            typeConfig.accentColor,
            typeConfig.hoverBg
          )}
        >
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#ff7a59]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <ClientCardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-xl p-2', typeConfig.iconBg, 'bg-opacity-10')}>
                <img
                  src={typeConfig.icon}
                  alt={`${typeConfig.label} icon`}
                  className="w-8 h-8 aspect-square object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <ClientCardTitle className="text-lg font-semibold text-slate-800">
                  {scenario.name || 'Unnamed Scenario'}
                </ClientCardTitle>
                <p className="text-sm text-slate-500">{typeConfig.label}</p>
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
                          typeConfig.progressColor
                        )}
                        style={{ width: `${Math.min(responseRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </ClientCardContent>
          {!isResearch && (
            <ClientCardFooter className="pt-0 pb-4 px-6">
              <div className="flex justify-end gap-2">
                <ClientButton
                  variant="ghost"
                  size="icon"
                  onClick={() => removeManualReply(scenario.id)}
                  disabled={isLoading || (scenario.manualRepliesCount || 0) === 0}
                  className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <ClientMinus className="w-4 h-4" />
                </ClientButton>
                <ClientButton
                  variant="ghost"
                  size="icon"
                  onClick={() => addManualReply(scenario.id)}
                  disabled={isLoading}
                  className="h-8 w-8 rounded-full hover:bg-green-50 hover:text-green-500 transition-colors"
                >
                  <ClientPlus className="w-4 h-4" />
                </ClientButton>
              </div>
            </ClientCardFooter>
          )}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 -mt-12">
          <ClientMotionDiv
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="h-full"
          >
            <ClientCard className="relative border border-slate-200/50 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group h-[240px] flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent pointer-events-none" />
              <ClientCardHeader className="pb-2 pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-xl shadow-sm">
                    <ClientUsers className="w-5 h-5 text-blue-500" />
                  </div>
                  <ClientCardTitle className="text-lg font-semibold text-slate-800">Total Contacts</ClientCardTitle>
                </div>
              </ClientCardHeader>
              <ClientCardContent className="flex-grow flex flex-col items-center justify-center pb-6">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getMetricColor('contacts', researchContactsCount)} [text-shadow:_0_1px_2px_rgb(0_0_0_/_5%)]`}>
                    {researchContactsCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500 mt-3">
                    Total contacts processed
                  </div>
                </div>
              </ClientCardContent>
            </ClientCard>
          </ClientMotionDiv>

          <ClientMotionDiv
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="h-full"
          >
            <ClientCard className="relative border border-slate-200/50 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group h-[240px] flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-green-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent pointer-events-none" />
              <ClientCardHeader className="pb-2 pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-xl shadow-sm">
                    <ClientMessageSquare className="w-5 h-5 text-green-500" />
                  </div>
                  <ClientCardTitle className="text-lg font-semibold text-slate-800">Total Responses</ClientCardTitle>
                </div>
              </ClientCardHeader>
              <ClientCardContent className="flex-grow flex flex-col items-center justify-center pb-6">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getMetricColor('responses', totalResponses)} [text-shadow:_0_1px_2px_rgb(0_0_0_/_5%)]`}>
                    {totalResponses.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500 mt-3">Positive responses received</div>
                </div>
              </ClientCardContent>
            </ClientCard>
          </ClientMotionDiv>

          <ClientMotionDiv
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="h-full"
          >
            <ClientCard className="relative border border-slate-200/50 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group h-[240px] flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent pointer-events-none" />
              <ClientCardHeader className="pb-2 pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-xl shadow-sm">
                    <ClientCalendar className="w-5 h-5 text-purple-500" />
                  </div>
                  <ClientCardTitle className="text-lg font-semibold text-slate-800">Appointments</ClientCardTitle>
                </div>
              </ClientCardHeader>
              <ClientCardContent className="flex-grow flex flex-col items-center justify-center relative">
                <div className="text-center">
                  <div className="text-5xl font-bold text-purple-600 [text-shadow:_0_1px_2px_rgb(0_0_0_/_5%)]">
                    {appointmentsCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500 mt-3">Total appointments booked</div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-3 pt-4">
                  <ClientButton
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (appointmentsCount > 0) {
                        deleteAppointment('latest');
                      }
                    }}
                    disabled={appointmentsCount === 0}
                    className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <ClientMinus className="w-4 h-4" />
                  </ClientButton>
                  <ClientButton
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAppointmentModal(true)}
                    className="h-8 w-8 rounded-full hover:bg-purple-50 hover:text-purple-500 transition-colors"
                  >
                    <ClientPlus className="w-4 h-4" />
                  </ClientButton>
                </div>
              </ClientCardContent>
            </ClientCard>
          </ClientMotionDiv>

          <ClientMotionDiv
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="h-full"
          >
            <ClientCard className="relative border border-slate-200/50 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group h-[240px] flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-yellow-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent pointer-events-none" />
              <ClientCardHeader className="pb-2 pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-100 rounded-xl shadow-sm">
                    <ClientTrendingUp className={`w-5 h-5 ${getMetricColor('rate', overallResponseRate)}`} />
                  </div>
                  <ClientCardTitle className="text-lg font-semibold text-slate-800">Response Rate</ClientCardTitle>
                </div>
              </ClientCardHeader>
              <ClientCardContent className="flex-grow flex flex-col items-center justify-center pb-6">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getMetricColor('rate', overallResponseRate)} [text-shadow:_0_1px_2px_rgb(0_0_0_/_5%)]`}>
                    {overallResponseRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-500 mt-3">Overall response rate</div>
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
              ) : scenarios.length === 0 ? (
                <ClientCard className="col-span-3 p-8 text-center border border-slate-200/50 bg-white/50 backdrop-blur-sm rounded-xl">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-slate-100 rounded-full shadow-sm">
                      <ClientBarChart className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500">No scenarios found</p>
                  </div>
                </ClientCard>
              ) : (
                scenarios.map((scenario, index) => renderScenarioCard(scenario, index))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Appointment Modal */}
      <ClientDialog open={showAppointmentModal} onOpenChange={setShowAppointmentModal}>
        <ClientDialogContent>
          <ClientDialogHeader>
            <ClientDialogTitle>Add New Appointment</ClientDialogTitle>
            <ClientDialogDescription>
              Add a new appointment to track your outreach success.
            </ClientDialogDescription>
          </ClientDialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const notes = formData.get('notes') as string;
            addAppointment(notes);
            setShowAppointmentModal(false);
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <ClientLabel htmlFor="notes">Notes (Optional)</ClientLabel>
                <ClientTextarea
                  id="notes"
                  name="notes"
                  placeholder="Add any relevant notes about the appointment..."
                />
              </div>
            </div>
            <ClientDialogFooter>
              <ClientButton type="button" variant="outline" onClick={() => setShowAppointmentModal(false)}>
                Cancel
              </ClientButton>
              <ClientButton type="submit">Add Appointment</ClientButton>
            </ClientDialogFooter>
          </form>
        </ClientDialogContent>
      </ClientDialog>
    </PageContainer>
  );
} 