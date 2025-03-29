'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Percent, CalendarCheck, ClipboardList, TrendingUp } from 'lucide-react';
import { subDays } from 'date-fns';
import { DateRangeFilter } from '@/components/filters/date-range-filter';
import { useSession } from 'next-auth/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type DateRange = {
  from: Date;
  to: Date;
};

interface OverallStats {
  contactsEnrolled: number;
  avgReplyRate: number;
  meetingsBooked: number;
  activeScenarios: number;
}

interface OrgStatsData {
  contactsEnrolled: number;
  totalResponses: number;
  replyRate: number;
  meetingsBooked: number;
  activeScenarios: number;
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

export default function AdminPanelPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CombinedStats>({ overall: null, organizations: [] });
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    if (session?.user?.role !== 'admin') {
      router.push('/scenarios');
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchAdminStats = async () => {
      if (!dateRange?.from || !dateRange?.to) return;
      setLoading(true);
      try {
        const url = new URL('/api/admin/stats', window.location.origin);
        url.searchParams.set('from', dateRange.from.toISOString());
        url.searchParams.set('to', dateRange.to.toISOString());
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`Failed to fetch admin stats: ${response.statusText}`);
        }
        const data: CombinedStats = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        setStats({ overall: null, organizations: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchAdminStats();
  }, [dateRange]);

  const handleBack = () => router.back();
  const handleDateRangeChange = (newRange: DateRange | undefined) => setDateRange(newRange);

  // Helper function to get style based on reply rate
  const getReplyRateStyle = (rate: number) => {
    if (rate >= 2) return "text-emerald-600";
    if (rate >= 1) return "text-amber-600";
    return "text-slate-600";
  };

  if (status === 'loading') {
    return <div className="flex items-center justify-center h-screen"><p className="text-gray-500">Loading...</p></div>;
  }
  if (session?.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">Platform-wide performance metrics and insights</p>
        </div>
        <Button variant="outline" onClick={handleBack} className="transition-all duration-200 hover:bg-slate-100">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex justify-end">
        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
      </div>

      <div>
        <div className="flex items-center mb-4">
          <div className="h-10 w-1 bg-gradient-to-b from-blue-600 to-violet-600 rounded mr-3"></div>
          <h2 className="text-xl font-semibold text-slate-800">Overall Performance</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="overflow-hidden border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts Enrolled</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-slate-900">
                  {stats.overall?.contactsEnrolled ?? '--'}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="h-1 bg-gradient-to-r from-violet-500 to-violet-600"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Reply Rate</CardTitle>
              <Percent className="h-4 w-4 text-violet-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className={`text-2xl font-bold ${getReplyRateStyle(stats.overall?.avgReplyRate || 0)}`}>
                  {stats.overall?.avgReplyRate}%
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Meetings Booked</CardTitle>
              <CalendarCheck className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold text-slate-900">
                  {stats.overall?.meetingsBooked ?? '--'}
                  {!loading && stats.overall?.meetingsBooked !== undefined && stats.overall?.meetingsBooked > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs font-normal text-emerald-600 border-emerald-200 bg-emerald-50">
                      <TrendingUp className="h-3 w-3 mr-1 inline" /> Goal
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-600"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Scenarios</CardTitle>
              <ClipboardList className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold text-slate-900">
                  {stats.overall?.activeScenarios ?? '--'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {!loading && !stats.overall && (
           <div className="text-center py-10 text-gray-500 mt-4 bg-slate-50 border border-slate-100 rounded-md">
              No overall statistics available for the selected period.
           </div>
        )}
      </div>

      <div>
        <div className="flex items-center mb-4">
          <div className="h-10 w-1 bg-gradient-to-b from-amber-500 to-red-500 rounded mr-3"></div>
          <h2 className="text-xl font-semibold text-slate-800">Organization Breakdown</h2>
        </div>
        
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200"></div>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50/80">
                  <TableHead className="w-[250px] text-slate-700">Organization</TableHead>
                  <TableHead className="text-right text-slate-700">Contacts Enrolled</TableHead>
                  <TableHead className="text-right text-slate-700">Total Replies</TableHead>
                  <TableHead className="text-right text-slate-700">Reply Rate</TableHead>
                  <TableHead className="text-right text-slate-700">Meetings Booked</TableHead>
                  <TableHead className="text-right text-slate-700">Active Scenarios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skel-${index}`} className="border-b border-slate-100">
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell>
                    </TableRow>
                  ))
                ) : stats.organizations.length > 0 ? (
                  stats.organizations.map((org, idx) => (
                    <TableRow 
                      key={org.id} 
                      className={`hover:bg-slate-50 transition-colors duration-150 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                    >
                      <TableCell className="font-medium py-3 border-b border-slate-100">
                        {org.name}
                      </TableCell>
                      <TableCell className="text-right py-3 border-b border-slate-100 text-slate-700">
                        {org.stats.contactsEnrolled}
                      </TableCell>
                      <TableCell className="text-right py-3 border-b border-slate-100 text-slate-700">
                        {org.stats.totalResponses}
                      </TableCell>
                      <TableCell className={`text-right py-3 border-b border-slate-100 ${getReplyRateStyle(org.stats.replyRate)}`}>
                        {org.stats.replyRate}%
                      </TableCell>
                      <TableCell className="text-right py-3 border-b border-slate-100 text-slate-700">
                        {org.stats.meetingsBooked > 0 ? (
                          <span className="font-medium text-emerald-600">{org.stats.meetingsBooked}</span>
                        ) : org.stats.meetingsBooked}
                      </TableCell>
                      <TableCell className="text-right py-3 border-b border-slate-100 text-slate-700">
                        {org.stats.activeScenarios}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground bg-slate-50/30">
                      No organization data available for the selected period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}