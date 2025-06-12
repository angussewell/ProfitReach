'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Percent, CalendarCheck, ClipboardList, TrendingUp, Mail, InfoIcon, Calendar as CalendarIcon } from 'lucide-react';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { DateRangeFilter } from '@/components/filters/date-range-filter'; // Assuming this is the correct component path
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useSession } from 'next-auth/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation'; // Needed for redirect check

import type { DateRange } from "react-day-picker";

// --- Interfaces (Copied from original admin page) ---
interface OverallStats {
  contactsEnrolled: number;
  avgReplyRate: number;
  meetingsBooked: number;
  activeScenarios: number;
  emailsSent?: number;
  responseNeededCount?: number;
}

interface OrgStatsData {
  contactsEnrolled: number;
  totalResponses: number;
  replyRate: number;
  meetingsBooked: number;
  activeScenarios: number;
  emailsSent?: number;
  responseNeededCount?: number;
  bookingRate?: number;
  replyToBookingRate?: number;
}

interface OrgStats {
  id: string;
  name: string;
  stats: OrgStatsData;
}

interface CombinedStats {
  overall: OverallStats | null;
  organizations: OrgStats[];
}

interface SetterStat {
  userEmail: string;
  replyCount: number;
}

interface SetterStatsMetadata {
  dateFiltered: boolean;
  organizationId: string;
  startDate?: string;
  endDate?: string;
  totalUsers: number;
  totalReplies?: number;
}

interface SetterStatsResponse {
  data: SetterStat[];
  metadata: SetterStatsMetadata;
}

// --- Component ---
export default function AnalyticsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // --- State Variables (Moved from original admin page) ---
  const [loading, setLoading] = useState(true); // Combined loading state for now
  const [stats, setStats] = useState<CombinedStats>({ overall: null, organizations: [] });
  type Preset = 'today' | '7d' | '14d' | '30d' | 'year' | 'all' | 'custom';
  const [selectedPreset, setSelectedPreset] = useState<Preset>('7d');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [customRangePopoverOpen, setCustomRangePopoverOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  const [setterStats, setSetterStats] = useState<SetterStat[]>([]);
  const [setterStatsLoading, setSetterStatsLoading] = useState(false);
  const [setterStatsError, setSetterStatsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("contacts"); // For Org Breakdown
  const [setterStatsMetadata, setSetterStatsMetadata] = useState<SetterStatsMetadata | null>(null);
  const [bypassDateFilter, setBypassDateFilter] = useState(false);
  const isDevelopment = process.env.NODE_ENV === 'development';

  // --- Effects (Moved from original admin page) ---
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    // Role check might be better handled in layout or middleware, but keep for now
    if (session?.user?.role !== 'admin') {
      // Redirect to a non-admin page or show an error
      router.push('/scenarios'); // Example redirect
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchAdminStats = async () => {
      if (selectedPreset !== 'all' && (!dateRange?.from || !dateRange?.to)) {
        console.log("Skipping fetch: dateRange not fully defined for non-'all' preset.");
        return;
      }
      setLoading(true); // Use the main loading state for now
      try {
        const url = new URL('/api/admin/stats', window.location.origin);
        if (dateRange?.from && dateRange?.to) {
          url.searchParams.set('from', dateRange.from.toISOString());
          url.searchParams.set('to', dateRange.to.toISOString());
        }
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`Failed to fetch admin stats: ${response.statusText}`);
        }
        const data: CombinedStats = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        setStats({ overall: null, organizations: [] }); // Reset on error
      } finally {
        setLoading(false); // Turn off main loading state
      }
    };

    const fetchSetterStats = async () => {
      if (selectedPreset !== 'all' && (!dateRange?.from || !dateRange?.to)) {
        console.log("Skipping setter stats fetch: dateRange not fully defined for non-'all' preset.");
        return;
      }
      setSetterStatsLoading(true);
      setSetterStatsError(null);
      try {
        const url = new URL('/api/admin/setter-stats', window.location.origin);
        if (dateRange?.from && dateRange?.to) {
          url.searchParams.set('startDate', dateRange.from.toISOString());
          url.searchParams.set('endDate', dateRange.to.toISOString());
        }
        if (bypassDateFilter) {
          url.searchParams.set('bypass_date_filter', 'true');
        }
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          const errorMessage = errorData.details?.message || errorData.error || response.statusText;
          throw new Error(`Failed to fetch setter stats: ${errorMessage}`);
        }
        const responseData: SetterStatsResponse = await response.json();
        if (responseData && 'data' in responseData) {
          setSetterStats(responseData.data || []);
          if (responseData.metadata) {
            setSetterStatsMetadata(responseData.metadata);
          }
        } else {
          console.warn('Unexpected setter stats response format:', responseData);
          setSetterStats(Array.isArray(responseData) ? responseData : []);
          setSetterStatsMetadata(null);
        }
      } catch (error) {
        console.error('Error fetching setter stats:', error);
        setSetterStatsError(`${error instanceof Error ? error.message : String(error)}`);
        setSetterStats([]);
      } finally {
        setSetterStatsLoading(false);
      }
    };

    fetchAdminStats();
    fetchSetterStats();
  }, [dateRange, selectedPreset, session, bypassDateFilter]); // Keep dependencies

  // --- Handlers (Moved from original admin page) ---
  const handlePresetSelect = (preset: Preset) => {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      setCustomRangePopoverOpen(true);
      return;
    }
    setCustomRangePopoverOpen(false);
    setCustomRange(undefined);

    const today = new Date();
    let from: Date | null = null, to: Date | null = null;
    switch (preset) {
      case 'today': from = startOfDay(today); to = endOfDay(today); break;
      case '7d': from = startOfDay(subDays(today, 6)); to = endOfDay(today); break;
      case '14d': from = startOfDay(subDays(today, 13)); to = endOfDay(today); break;
      case '30d': from = startOfDay(subDays(today, 29)); to = endOfDay(today); break;
      case 'year': from = startOfDay(subDays(today, 364)); to = endOfDay(today); break;
      case 'all': setDateRange(undefined); return;
      default: from = startOfDay(today); to = endOfDay(today);
    }
    setDateRange({ from, to });
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setCustomRange(range);
  };

  // --- Helper Functions (Moved from original admin page) ---
  const getReplyRateStyle = (rate: number) => {
    if (rate >= 2) return "text-emerald-600";
    if (rate >= 1) return "text-amber-600";
    return "text-slate-600";
  };

  // --- Render Logic ---
  if (status === 'loading') {
    // Consider a more specific loading state if needed, maybe tied to the layout
    return <div className="flex items-center justify-center h-full"><p className="text-gray-500">Loading Analytics...</p></div>;
  }
  // Basic auth check - might be redundant if layout handles it
  if (session?.user?.role !== 'admin') {
     return <div className="flex items-center justify-center h-full"><p className="text-red-500">Access Denied</p></div>;
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
          Analytics Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">Performance metrics and insights</p>
      </div>

      {/* Date Range Filter Section */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2 justify-end">
          <div className="flex gap-2 mb-1 flex-wrap">
            <Button variant={selectedPreset === 'today' ? 'default' : 'outline'} onClick={() => handlePresetSelect('today')}>Today</Button>
            <Button variant={selectedPreset === '7d' ? 'default' : 'outline'} onClick={() => handlePresetSelect('7d')}>Last 7 days</Button>
            <Button variant={selectedPreset === '14d' ? 'default' : 'outline'} onClick={() => handlePresetSelect('14d')}>Last 14 days</Button>
            <Button variant={selectedPreset === '30d' ? 'default' : 'outline'} onClick={() => handlePresetSelect('30d')}>Last 30 days</Button>
            <Button variant={selectedPreset === 'year' ? 'default' : 'outline'} onClick={() => handlePresetSelect('year')}>Last Year</Button>
            <Button variant={selectedPreset === 'all' ? 'default' : 'outline'} onClick={() => handlePresetSelect('all')}>All Time</Button>
            <Popover open={customRangePopoverOpen} onOpenChange={setCustomRangePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={selectedPreset === 'custom' ? 'default' : 'outline'}
                  className={cn("w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedPreset === 'custom' && dateRange?.from && dateRange?.to ? (
                    <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                  ) : (
                    <span>Custom Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4">
                  <Calendar mode="range" selected={customRange} onSelect={handleCalendarSelect} numberOfMonths={2} initialFocus />
                  {customRange?.from && customRange?.to && (
                    <div className="text-sm text-center py-2 px-2 mt-2 bg-slate-50 rounded border border-slate-200">
                      <span className="font-medium">Selected:</span> {format(customRange.from, "PPP")} - {format(customRange.to, "PPP")}
                    </div>
                  )}
                  <div className="flex justify-between mt-3">
                    <Button variant="outline" size="sm" onClick={() => setCustomRange(undefined)} disabled={!customRange?.from && !customRange?.to}>Clear</Button>
                    <Button
                      onClick={() => {
                        if (customRange?.from && customRange?.to) {
                          setDateRange({ from: startOfDay(customRange.from), to: endOfDay(customRange.to) });
                          setSelectedPreset('custom');
                          setCustomRangePopoverOpen(false);
                        }
                      }}
                      disabled={!customRange?.from || !customRange?.to}
                      size="sm"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Overall Performance Section */}
      <div>
        <div className="flex items-center mb-4">
          <div className="h-10 w-1 bg-gradient-to-b from-blue-600 to-violet-600 rounded mr-3"></div>
          <h2 className="text-xl font-semibold text-slate-800">Overall Performance</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Cards moved from original admin page */}
          <Card className="overflow-hidden border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts Researched</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold text-slate-900">{stats.overall?.contactsEnrolled ?? '--'}</div>}
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="h-1 bg-gradient-to-r from-sky-500 to-sky-600"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Emails Sent</CardTitle>
              <Mail className="h-4 w-4 text-sky-600" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold text-slate-900">{stats.overall?.emailsSent ?? '--'}</div>}
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="h-1 bg-gradient-to-r from-violet-500 to-violet-600"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Reply Rate</CardTitle>
              <Percent className="h-4 w-4 text-violet-600" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <div className={`text-2xl font-bold ${getReplyRateStyle(stats.overall?.avgReplyRate || 0)}`}>{stats.overall?.avgReplyRate === null || stats.overall?.avgReplyRate === undefined ? '--' : `${stats.overall.avgReplyRate.toFixed(1)}%`}</div>}
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Meetings Booked</CardTitle>
              <CalendarCheck className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold text-slate-900 flex items-center">{stats.overall?.meetingsBooked ?? '--'}{!loading && stats.overall?.meetingsBooked !== undefined && stats.overall?.meetingsBooked > 0 && (<Badge variant="outline" className="ml-2 text-xs font-normal text-emerald-600 border-emerald-200 bg-emerald-50"><TrendingUp className="h-3 w-3 mr-1 inline" /> Goal</Badge>)}</div>}
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-600"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Scenarios</CardTitle>
              <ClipboardList className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold text-slate-900">{stats.overall?.activeScenarios ?? '--'}</div>}
            </CardContent>
          </Card>
        </div>
        {!loading && !stats.overall && (
           <div className="text-center py-10 text-gray-500 mt-4 bg-slate-50 border border-slate-100 rounded-md">No overall statistics available for the selected period.</div>
        )}
      </div>

      {/* Organization Breakdown Section */}
      <div>
        <div className="flex items-center mb-4">
          <div className="h-10 w-1 bg-gradient-to-b from-amber-500 to-red-500 rounded mr-3"></div>
          <h2 className="text-xl font-semibold text-slate-800">Organization Breakdown</h2>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="replies">Replies</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>
          {/* TabsContent moved from original admin page */}
          <TabsContent value="contacts">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200"></div>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[250px] text-slate-700 pl-4">Organization</TableHead><TableHead className="text-right text-slate-700">Contacts Researched</TableHead><TableHead className="text-right text-slate-700">Emails Sent</TableHead><TableHead className="text-right text-slate-700">Active Scenarios</TableHead>{/* Removed Actions */}</TableRow></TableHeader>
                  <TableBody>
                    {loading ? (Array.from({ length: 3 }).map((_, index) => (<TableRow key={`skel-contacts-${index}`} className="border-b border-slate-100"><TableCell className="pl-4"><Skeleton className="h-5 w-3/4" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell></TableRow>)))
                    : stats.organizations.length > 0 ? (stats.organizations.map((org, idx) => (<TableRow key={org.id} className={`hover:bg-slate-50 transition-colors duration-150 border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}><TableCell className="font-medium py-3 pl-4">{org.name}</TableCell><TableCell className="text-right py-3 text-slate-700">{org.stats?.contactsEnrolled ?? '--'}</TableCell><TableCell className="text-right py-3 text-slate-700">{org.stats?.emailsSent ?? '--'}</TableCell><TableCell className="text-right py-3 text-slate-700">{org.stats?.activeScenarios ?? '--'}</TableCell></TableRow>)))
                    : (<TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground bg-slate-50/30 border-b border-slate-100">No organization data available.</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="replies">
             <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200"></div>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[250px] text-slate-700 pl-4">Organization</TableHead><TableHead className="text-right text-slate-700">Total Replies</TableHead><TableHead className="text-right text-slate-700">Reply Rate (%)</TableHead><TableHead className="text-right text-slate-700">Response Needed</TableHead>{/* Removed Actions */}</TableRow></TableHeader>
                  <TableBody>
                    {loading ? (Array.from({ length: 3 }).map((_, index) => (<TableRow key={`skel-replies-${index}`} className="border-b border-slate-100"><TableCell className="pl-4"><Skeleton className="h-5 w-3/4" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell></TableRow>)))
                    : stats.organizations.length > 0 ? (stats.organizations.map((org, idx) => (<TableRow key={org.id} className={`hover:bg-slate-50 transition-colors duration-150 border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}><TableCell className="font-medium py-3 pl-4">{org.name}</TableCell><TableCell className="text-right py-3 text-slate-700">{org.stats?.totalResponses ?? '--'}</TableCell><TableCell className="text-right py-3 text-slate-700">{org.stats?.replyRate !== undefined && org.stats?.replyRate !== null ? `${org.stats.replyRate.toFixed(1)}%` : '--'}</TableCell><TableCell className="text-right py-3 text-slate-700">{org.stats?.responseNeededCount ?? '--'}</TableCell></TableRow>)))
                    : (<TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground bg-slate-50/30 border-b border-slate-100">No organization data available.</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="bookings">
             <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200"></div>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[250px] text-slate-700 pl-4">Organization</TableHead><TableHead className="text-right text-slate-700">Meetings Booked</TableHead><TableHead className="text-right text-slate-700">Booking Rate (%)</TableHead><TableHead className="text-right text-slate-700">Reply-to-Booking Rate (%)</TableHead>{/* Removed Actions */}</TableRow></TableHeader>
                  <TableBody>
                    {loading ? (Array.from({ length: 3 }).map((_, index) => (<TableRow key={`skel-bookings-${index}`} className="border-b border-slate-100"><TableCell className="pl-4"><Skeleton className="h-5 w-3/4" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell></TableRow>)))
                    : stats.organizations.length > 0 ? (stats.organizations.map((org, idx) => (<TableRow key={org.id} className={`hover:bg-slate-50 transition-colors duration-150 border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}><TableCell className="font-medium py-3 pl-4">{org.name}</TableCell><TableCell className="text-right py-3 text-slate-700">{org.stats?.meetingsBooked ?? '--'}</TableCell><TableCell className="text-right py-3 text-slate-700">{org.stats?.bookingRate !== undefined && org.stats?.bookingRate !== null ? `${org.stats.bookingRate.toFixed(1)}%` : '--'}</TableCell><TableCell className="text-right py-3 text-slate-700">{org.stats?.replyToBookingRate !== undefined && org.stats?.replyToBookingRate !== null ? `${org.stats.replyToBookingRate.toFixed(1)}%` : '--'}</TableCell></TableRow>)))
                    : (<TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground bg-slate-50/30 border-b border-slate-100">No organization data available.</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Setter Statistics Section */}
      <div className="mt-8">
        <div className="flex items-center mb-4">
          <div className="h-10 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 rounded mr-3"></div>
          <h2 className="text-xl font-semibold text-slate-800">Setter Statistics</h2>
        </div>
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 pb-2">
            <CardTitle className="text-base font-medium">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center"><Mail className="mr-2 h-4 w-4 text-indigo-500" /><span>Reply Statistics by User</span></div>
                {isDevelopment && (
                  <div className="flex items-center text-xs">
                    <label className="inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={bypassDateFilter} onChange={() => setBypassDateFilter(!bypassDateFilter)} className="sr-only peer" />
                      <div className="relative w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-blue-500 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                      <span className="ms-2 text-xs text-gray-500">Bypass Date Filter</span>
                    </label>
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {setterStatsLoading ? (
              <div className="py-6">{Array.from({ length: 3 }).map((_, index) => (<div key={`skel-setter-${index}`} className="flex justify-between items-center py-3 border-b border-slate-100"><Skeleton className="h-5 w-[200px]" /><Skeleton className="h-5 w-[60px]" /></div>))}</div>
            ) : setterStatsError ? (
              <div className="py-6 text-center text-red-500"><p>{setterStatsError}</p></div>
            ) : setterStats.length > 0 ? (
              <>
                {setterStatsMetadata && !setterStatsMetadata.dateFiltered && (<div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm"><InfoIcon className="inline-block h-4 w-4 mr-1" />Note: Showing all available data (date filtering was bypassed or no data found in the selected date range).</div>)}
                {setterStatsMetadata && (<div className="mb-4 text-sm text-slate-500"><p>Total users with replies: <span className="font-medium">{setterStatsMetadata.totalUsers}</span></p>{setterStatsMetadata.totalReplies !== undefined && (<p>Total replies sent: <span className="font-medium">{setterStatsMetadata.totalReplies}</span></p>)}</div>)}
                <Table>
                  <TableHeader><TableRow className="bg-slate-50/50 hover:bg-slate-50/80 border-b border-slate-200"><TableHead className="text-slate-700 pl-4">User Email</TableHead><TableHead className="text-right text-slate-700 pr-4">Replies Sent</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {setterStats.map((stat, idx) => (<TableRow key={`setter-${idx}`} className={`hover:bg-slate-50 transition-colors duration-150 border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}><TableCell className="font-medium py-3 pl-4">{stat.userEmail}</TableCell><TableCell className="text-right py-3 pr-4 font-semibold text-indigo-600">{stat.replyCount}</TableCell></TableRow>))}
                  </TableBody>
                </Table>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500"><p>No reply data available for the selected period.</p><p className="text-sm mt-1">Replies will be tracked when users respond to messages.</p></div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
