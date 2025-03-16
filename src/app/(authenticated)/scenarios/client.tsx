'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import type { DateRange as DayPickerDateRange } from 'react-day-picker';
import dynamic from 'next/dynamic';
import { Users, MessageSquare, TrendingUp, BarChart, Calendar, Plus, Minus, Loader2 } from 'lucide-react';
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
import { AppointmentsList } from '@/components/appointments/appointments-list';
import { CreateAppointmentDialog } from '@/components/appointments/create-appointment-dialog';
import { formatDateInCentralTime } from '@/lib/date-utils';

// Dynamic imports with proper error handling
const ClientImage = dynamic(() => import('next/image').catch(err => {
  console.error('Error loading Image component:', err);
  return () => <div>Error loading image</div>;
}), { 
  ssr: false,
  loading: () => <div className="w-8 h-8 bg-gray-200 animate-pulse rounded-lg" />
});

// Client components with proper types
const ClientCard = Card;
const ClientCardHeader = CardHeader;
const ClientCardTitle = CardTitle;
const ClientCardContent = CardContent;
const ClientCardFooter = CardFooter;
const ClientButton = Button;
const ClientDialog = Dialog;
const ClientDialogContent = DialogContent;
const ClientDialogHeader = DialogHeader;
const ClientDialogTitle = DialogTitle;
const ClientDialogDescription = DialogDescription;
const ClientDialogFooter = DialogFooter;
const ClientTextarea = Textarea;
const ClientLabel = Label;

// Icons with proper types
const ClientUsers = Users;
const ClientMessageSquare = MessageSquare;
const ClientTrendingUp = TrendingUp;
const ClientBarChart = BarChart;
const ClientCalendar = Calendar;
const ClientPlus = Plus;
const ClientMinus = Minus;
const ClientLoader = Loader2;

// Motion component with proper types
const ClientMotionDiv = motion.div;

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

interface Appointment {
  id: string;
  clientName: string;
  appointmentType: string;
  appointmentDateTime: string;
  notes: string | null;
  status: string;
  organizationId: string;
  createdAt: string;
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const { toast } = useToast();
  const [researchContactsCount, setResearchContactsCount] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Build URL with date range parameters
      const url = new URL('/api/scenarios/analytics', window.location.origin);
      if (dateRange?.from && dateRange?.to) {
        url.searchParams.set('from', dateRange.from.toISOString());
        url.searchParams.set('to', dateRange.to.toISOString());
      }
      
      // Fetch scenarios from the API
      const response = await fetch(url, {
        credentials: 'include', // Add this to include auth cookies
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch scenarios: ${response.statusText}`);
      }
      
      const data: AnalyticsResponse = await response.json();
      setScenarios(data.scenarios);
      setAppointmentsCount(data.appointmentsCount);
      
      // Fetch research contacts count
      try {
        if (dateRange?.from && dateRange?.to) {
          const researchUrl = new URL('/api/webhooks/research-count', window.location.origin);
          researchUrl.searchParams.set('from', dateRange.from.toISOString());
          researchUrl.searchParams.set('to', dateRange.to.toISOString());
          
          const researchResponse = await fetch(researchUrl, {
            credentials: 'include', // Add this to include auth cookies
          });
          
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

  const fetchAppointments = async () => {
    const params = new URLSearchParams();
    if (dateRange?.from && dateRange?.to) {
      params.append('from', dateRange.from.toISOString());
      params.append('to', dateRange.to.toISOString());
    }

    try {
      const response = await fetch(`/api/appointments?${params.toString()}`, {
        credentials: 'include',
      });
      
      let errorData;
      if (!response.ok) {
        try {
          errorData = await response.json();
        } catch {
          throw new Error('Failed to fetch appointments');
        }
        throw new Error(errorData.error || 'Failed to fetch appointments');
      }

      const data = await response.json();
      // Format dates with +4 hour offset for display only
      const formattedAppointments = data.map((appointment: Appointment) => ({
        ...appointment,
        appointmentDateTime: appointment.appointmentDateTime ? 
          formatDateInCentralTime(new Date(appointment.appointmentDateTime)) : 
          undefined
      }));
      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error instanceof Error ? error.message : error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch appointments',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [dateRange]);

  // Helper function to infer type from scenario name and touchpointType
  const inferTypeFromName = (name: string, touchpointType?: string): string => {
    // First check touchpointType if available
    if (touchpointType) {
      const normalizedType = touchpointType.toLowerCase().trim();
      if (normalizedType.includes('linkedin')) return 'linkedin';
      if (normalizedType.includes('email')) return 'email';
      if (normalizedType.includes('research')) return 'research';
    }

    // Fall back to name-based inference
    const normalizedName = name.toLowerCase().trim();
    if (normalizedName.includes('linkedin') || 
        normalizedName.includes('connection') ||
        normalizedName.includes('network')) {
      return 'linkedin';
    } else if (normalizedName.includes('email') || 
              normalizedName.includes('outreach') || 
              normalizedName.includes('follow up')) {
      return 'email';
    } else if (normalizedName.includes('research')) {
      return 'research';
    }
    return 'unknown';
  };

  // Format response rate to avoid NaN
  const formatResponseRate = (contacts: number, responses: number): string => {
    if (!contacts || !responses) return '0.0%';
    const rate = (responses / contacts) * 100;
    return isNaN(rate) ? '0.0%' : `${rate.toFixed(1)}%`;
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
        credentials: 'include', // Add this to include auth cookies
      });

      if (!response.ok) {
        throw new Error(`Failed to add reply: ${response.statusText}`);
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
        credentials: 'include', // Add this to include auth cookies
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
  const addAppointment = async (data: {
    clientName: string;
    appointmentType: string;
    appointmentDateTime: string;
    notes?: string;
    status: string;
  }) => {
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Add this to include auth cookies
        body: JSON.stringify(data),
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

  const handleCreateAppointment = async (data: {
    clientName: string;
    appointmentType: string;
    appointmentDateTime: string;
    notes?: string;
    status: string;
  }) => {
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        let errorMessage = 'Failed to create appointment';
        if (responseData.errors) {
          errorMessage = responseData.errors.map((err: any) => err.message).join(', ');
        } else if (responseData.error) {
          errorMessage = responseData.error;
        }
        throw new Error(errorMessage);
      }
      
      // First fetch appointments to update the list
      await fetchAppointments();
      
      // Then fetch analytics to update counts
      await fetchData();
      
      setShowAppointmentModal(false);
      toast({
        title: 'Success',
        description: 'Appointment created successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error creating appointment:', error instanceof Error ? error.message : error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create appointment',
        variant: 'destructive',
      });
    }
  };

  const handleDateRangeChange = (newDateRange: DayPickerDateRange | undefined) => {
    // Ensure both from and to dates are set
    if (newDateRange?.from && newDateRange?.to) {
      setDateRange({
        from: newDateRange.from,
        to: newDateRange.to
      });
    } else {
      setDateRange(undefined);
    }
  };

  return (
    <PageContainer>
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Scenarios</h1>
        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
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
            <ClientCardContent className="flex-grow flex flex-col items-center justify-center pb-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-purple-600 [text-shadow:_0_1px_2px_rgb(0_0_0_/_5%)]">
                  {appointmentsCount.toLocaleString()}
                </div>
                <div className="text-sm text-slate-500 mt-3">
                  Total appointments booked
                </div>
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

      {/* Appointments Section - Full Width */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-800">Appointments</h2>
            <div className="text-sm text-slate-500">({appointments.length})</div>
          </div>
          <ClientButton 
            onClick={() => setShowAppointmentModal(true)}
            className="bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700"
          >
            <ClientCalendar className="w-4 h-4 mr-2" />
            New Appointment
          </ClientButton>
        </div>
        <AppointmentsList appointments={appointments} />
      </div>

      {/* Scenarios Section */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {scenarios.map((scenario) => {
            const type = inferTypeFromName(scenario.name, scenario.touchpointType);
            const config = getTypeConfig(type);
            const rate = scenario.totalContacts && scenario.responseCount ? (scenario.responseCount / scenario.totalContacts) * 100 : 0;
            const responseRate = formatResponseRate(scenario.totalContacts, scenario.responseCount);

            return (
              <ClientMotionDiv
                key={scenario.id}
                className="h-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={cn(
                  "technical-card technical-card group border shadow-lg hover:shadow-xl transition-all duration-300",
                  "rounded-xl overflow-hidden",
                  config.bgColor,
                  config.accentColor,
                  config.hoverBg,
                  "min-h-[250px] flex flex-col"
                )}>
                  <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#ff7a59]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex flex-col space-y-1.5 p-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("rounded-xl p-2", "bg-gray-100 bg-opacity-10")}>
                        <ClientImage
                          src={config.icon}
                          alt={`${config.label} icon`}
                          width={32}
                          height={32}
                          className="aspect-square object-contain"
                        />
                      </div>
                      <div>
                        <h3 className="technical-header text-base font-semibold text-slate-800">
                          {scenario.name}
                        </h3>
                        <p className="text-xs text-slate-500">{config.label}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-slate-500">Total Contacts</div>
                        <div className={cn(
                          "text-lg font-bold [text-shadow:_0_1px_2px_rgb(0_0_0_/_5%)]",
                          getMetricColor('contacts', scenario.totalContacts)
                        )}>
                          {scenario.totalContacts}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Total Responses</div>
                        <div className={cn(
                          "text-lg font-bold [text-shadow:_0_1px_2px_rgb(0_0_0_/_5%)]",
                          getMetricColor('responses', scenario.responseCount)
                        )}>
                          {scenario.responseCount}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-500">Response Rate</div>
                          <div className="text-xs font-medium text-[#ff7a59]">
                            {responseRate}
                          </div>
                        </div>
                        <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                          <div
                            className={cn(
                              "h-full bg-gradient-to-r rounded-full transition-all duration-500 shadow-sm",
                              config.progressColor
                            )}
                            style={{
                              width: `${rate}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-2 mt-4">
                    <ClientButton
                      variant="ghost"
                      size="icon"
                      onClick={() => removeManualReply(scenario.id)}
                      disabled={actionLoading[scenario.id] || scenario.responseCount === 0}
                      className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      {actionLoading[scenario.id] ? (
                        <ClientLoader className="w-4 h-4 animate-spin" />
                      ) : (
                        <ClientMinus className="w-4 h-4" />
                      )}
                    </ClientButton>
                    <ClientButton
                      variant="ghost"
                      size="icon"
                      onClick={() => addManualReply(scenario.id)}
                      disabled={actionLoading[scenario.id]}
                      className="h-8 w-8 rounded-full hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] transition-colors"
                    >
                      {actionLoading[scenario.id] ? (
                        <ClientLoader className="w-4 h-4 animate-spin" />
                      ) : (
                        <ClientPlus className="w-4 h-4" />
                      )}
                    </ClientButton>
                  </div>
                </div>
              </ClientMotionDiv>
            );
          })}
        </div>
      </div>

      <CreateAppointmentDialog
        open={showAppointmentModal}
        onOpenChange={setShowAppointmentModal}
        onSubmit={handleCreateAppointment}
      />
    </PageContainer>
  );
}