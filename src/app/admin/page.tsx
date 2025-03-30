'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Percent, CalendarCheck, ClipboardList, TrendingUp, Eye, Loader2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from 'react-hot-toast';

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

interface Task {
  "Client Name": string;
  "Task Name": string;
  Status: string;
  Description: string;
  "Assigned To": string;
  Order?: string;
  "Due Date": string;
}

// Add a utility function to handle field name differences
const getTaskField = (task: any, camelCaseField: string, titleCaseField: string): any => {
  // Try camelCase first (like from n8n), then Title Case (like from mock data)
  return task[camelCaseField] !== undefined ? task[camelCaseField] : task[titleCaseField];
};

export default function AdminPanelPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CombinedStats>({ overall: null, organizations: [] });
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedOrgName, setSelectedOrgName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  // Add a new state to store the raw received data for testing
  const [receivedTaskData, setReceivedTaskData] = useState<any[]>([]);
  const [showReceivedData, setShowReceivedData] = useState(false);
  
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
  }, [dateRange, session]);

  // Replace the current useEffect for handling modal opening
  useEffect(() => {
    if (isTaskModalOpen && selectedOrgName) {
      // Directly call the reliable fetch function when the modal opens
      console.log(`🔍 FRONTEND: Modal opened for ${selectedOrgName}, calling fetchTasksFromServer...`);
      fetchTasksFromServer(selectedOrgName);
    }
  }, [isTaskModalOpen, selectedOrgName]);

  const handleBack = () => router.back();
  const handleDateRangeChange = (newRange: DateRange | undefined) => setDateRange(newRange);

  const handleViewTasks = (orgName: string) => {
    setSelectedOrgName(orgName);
    setIsTaskModalOpen(true);
  };

  // Update the runApiTest function to also check the tasks-receive endpoint
  const runApiTest = async () => {
    console.log("🔍 FRONTEND: Starting direct API test...");
    setTasksLoading(true);
    setTaskError("Running test...");
    setShowReceivedData(true);
    
    try {
      // Test the test endpoint first
      console.log("🔍 FRONTEND: Testing /api/admin/test endpoint...");
      const testResponse = await fetch('/api/admin/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true }),
      });
      
      console.log(`🔍 FRONTEND: Test endpoint response status: ${testResponse.status}`);
      const testData = await testResponse.json();
      console.log("🔍 FRONTEND: Test endpoint response data:", testData);
      
      // Now test the actual tasks endpoint
      console.log("🔍 FRONTEND: Testing /api/admin/tasks endpoint...");
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationName: "Test Organization" }),
      });
      
      console.log(`🔍 FRONTEND: Tasks endpoint response status: ${response.status}`);
      
      // Handle different response statuses
      if (response.status === 403) {
        setTaskError("Authentication error - not authorized as admin");
        console.log("🔍 FRONTEND: Authentication failed - not admin");
        return;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`🔍 FRONTEND: Response error: ${errorText}`);
        setTaskError(`API error: ${response.status} - ${errorText}`);
        return;
      }
      
      // Try to parse the response as JSON
      try {
        const data = await response.json();
        console.log("🔍 FRONTEND: Successfully parsed response JSON:", data);
        
        if (Array.isArray(data)) {
          console.log(`🔍 FRONTEND: Response is an array with ${data.length} items`);
          setTasks(data);
          if (data.length === 0) {
            setTaskError("Tasks endpoint returned an empty array.");
          } else {
            setTaskError(null);
          }
        } else {
          console.log("🔍 FRONTEND: Response is not an array:", typeof data);
          setTaskError("Invalid response format - expected array");
        }
      } catch (parseError) {
        console.error("🔍 FRONTEND: Error parsing response as JSON:", parseError);
        setTaskError("Failed to parse API response");
      }

      // NEW SECTION: Test the mock-tasks endpoint
      console.log("🔍 FRONTEND: Testing /api/admin/mock-tasks endpoint...");
      const mockResponse = await fetch('/api/admin/mock-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationName: "Test Organization" }),
      });
      
      console.log(`🔍 FRONTEND: Mock tasks endpoint response status: ${mockResponse.status}`);
      
      if (!mockResponse.ok) {
        console.log(`🔍 FRONTEND: Mock tasks endpoint error: ${mockResponse.status}`);
      } else {
        try {
          const mockData = await mockResponse.json();
          console.log("🔍 FRONTEND: Successfully parsed mock endpoint JSON:", mockData);
          
          if (Array.isArray(mockData)) {
            console.log(`🔍 FRONTEND: Mock endpoint response is an array with ${mockData.length} items`);
            if (mockData.length > 0) {
              console.log(`🔍 FRONTEND: First mock task: ${JSON.stringify(mockData[0])}`);
              setTasks(mockData); // Use mock data to display something
              setTaskError("Using MOCK DATA - real endpoint returned empty array");
            }
          } else {
            console.log("🔍 FRONTEND: Mock endpoint response is not an array:", typeof mockData);
          }
        } catch (mockParseError) {
          console.error("🔍 FRONTEND: Error parsing mock endpoint response:", mockParseError);
        }
      }

      // NEW SECTION: Test the tasks-receive endpoint
      console.log("🔍 FRONTEND: Testing /api/admin/tasks-receive endpoint for all stored data...");
      const tasksReceiveResponse = await fetch(`/api/admin/tasks-receive?organizationName=Scale Your Cause`, {
        method: 'GET',
      });
      
      console.log(`🔍 FRONTEND: tasks-receive endpoint response status: ${tasksReceiveResponse.status}`);
      
      if (!tasksReceiveResponse.ok) {
        console.log(`🔍 FRONTEND: tasks-receive endpoint error: ${tasksReceiveResponse.status}`);
      } else {
        try {
          const receiveData = await tasksReceiveResponse.json();
          console.log("🔍 FRONTEND: Successfully parsed tasks-receive endpoint JSON:", receiveData);
          
          if (Array.isArray(receiveData)) {
            console.log(`🔍 FRONTEND: tasks-receive endpoint returned ${receiveData.length} items`);
            setReceivedTaskData(receiveData);
            
            if (receiveData.length > 0) {
              console.log(`🔍 FRONTEND: First received task: ${JSON.stringify(receiveData[0])}`);
              setTasks(receiveData); // Use received data to display
              setTaskError("Using STORED DATA from tasks-receive endpoint");
            } else {
              setTaskError("No data found in tasks-receive storage");
            }
          } else {
            console.log("🔍 FRONTEND: tasks-receive endpoint response is not an array:", typeof receiveData);
            setReceivedTaskData([]);
          }
        } catch (receiveParseError) {
          console.error("🔍 FRONTEND: Error parsing tasks-receive endpoint response:", receiveParseError);
          setReceivedTaskData([]);
        }
      }

    } catch (error) {
      console.error("🔍 FRONTEND: Error in API test:", error);
      setTaskError(`API test failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTasksLoading(false);
    }
  };

  // Add a function to fetch tasks from the tasks-receive API
  const fetchTasksFromServer = async (orgName: string) => {
    console.log(`🔍 FRONTEND: Fetching tasks for "${orgName}" from server...`);
    setTasksLoading(true);
    setShowReceivedData(true);
    setTaskError(`Loading tasks for ${orgName}...`);
    
    try {
      // Add debugging for the fetch request
      console.log(`🔍 FRONTEND: Starting fetch to tasks-receive endpoint...`);
      
      const response = await fetch(`/api/admin/tasks-receive?organizationName=${encodeURIComponent(orgName)}`, {
        method: 'GET',
        // Add cache control to prevent caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      console.log(`🔍 FRONTEND: Response status: ${response.status}, statusText: ${response.statusText}`);
      
      if (!response.ok) {
        console.error(`🔍 FRONTEND: Error fetching tasks - Status ${response.status}`);
        
        // Try to get more error details
        let errorText = await response.text();
        console.error(`🔍 FRONTEND: Error response body: ${errorText}`);
        
        setTaskError(`Error fetching tasks: ${response.statusText} - ${errorText}`);
        setReceivedTaskData([]);
        setTasks([]);
      } else {
        const fetchedTasks = await response.json();
        console.log(`🔍 FRONTEND: Fetched ${Array.isArray(fetchedTasks) ? fetchedTasks.length : 'non-array'} result`);
        
        if (Array.isArray(fetchedTasks) && fetchedTasks.length > 0) {
          console.log(`🔍 FRONTEND: First task sample:`, fetchedTasks[0]);
          setReceivedTaskData(fetchedTasks);
          setTasks(fetchedTasks);
          setTaskError(`Successfully fetched ${fetchedTasks.length} tasks from server for ${orgName}`);
        } else {
          console.log(`🔍 FRONTEND: No tasks found, response:`, fetchedTasks);
          
          // EMERGENCY MOCK DATA FALLBACK
          console.log(`🔍 FRONTEND: Using frontend emergency mock data fallback`);
          const emergencyMockData = [
            {
              "Task Name": "FRONTEND MOCK: Follow Up With New Leads",
              "Client Name": orgName,
              "Status": "Not Started",
              "Description": "This is frontend emergency mock data because no real data was found on the server.",
              "Assigned To": "Sales Team",
              "Due Date": new Date().toISOString()
            },
            {
              "Task Name": "FRONTEND MOCK: Update Website Content",
              "Client Name": orgName,
              "Status": "In Progress",
              "Description": "This is frontend emergency mock data because no real data was found on the server.",
              "Assigned To": "Marketing Team",
              "Due Date": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }
          ];
          
          setReceivedTaskData(emergencyMockData);
          setTasks(emergencyMockData);
          setTaskError(`No real tasks found. Using FRONTEND emergency mock data for ${orgName}.`);
        }
      }
    } catch (error) {
      console.error('🔍 FRONTEND: Error fetching tasks:', error);
      
      // WORST CASE FALLBACK - Always show something even if everything fails
      console.log(`🔍 FRONTEND: Using worst-case fallback mock data`);
      const fallbackMockData = [
        {
          "Task Name": "ERROR FALLBACK: Review Marketing Strategy",
          "Client Name": orgName,
          "Status": "Not Started",
          "Description": "This is emergency fallback data shown because an error occurred.",
          "Assigned To": "Marketing Team",
          "Due Date": new Date().toISOString()
        }
      ];
      
      setTaskError(`Error fetching tasks: ${error instanceof Error ? error.message : String(error)}`);
      setReceivedTaskData(fallbackMockData);
      setTasks(fallbackMockData);
    } finally {
      setTasksLoading(false);
    }
  };

  const getReplyRateStyle = (rate: number) => {
    if (rate >= 2) return "text-emerald-600";
    if (rate >= 1) return "text-amber-600";
    return "text-slate-600";
  };

  const getStatusBadgeClasses = (status: string): string => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'done') {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    if (lowerStatus === 'in progress') {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }
    if (lowerStatus === 'ready') {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (lowerStatus === 'not started') {
      return 'bg-slate-100 text-slate-700 border-slate-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
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

      <div className="flex justify-between items-center">
        <div className="flex justify-end">
          <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={() => fetchTasksFromServer("Scale Your Cause")} 
            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
          >
            Fetch Tasks
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => {
              setReceivedTaskData([]);
              setTasks([]);
              setTaskError("Cleared displayed tasks");
              setShowReceivedData(false);
            }}
            className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
          >
            Clear Display
          </Button>
          
          <Button 
            variant="outline" 
            onClick={runApiTest} 
            className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
          >
            Run API Test
          </Button>
        </div>
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
                  {stats.overall?.avgReplyRate === null || stats.overall?.avgReplyRate === undefined ? '--' : `${stats.overall.avgReplyRate.toFixed(1)}%`}
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
                <div className="text-2xl font-bold text-slate-900 flex items-center">
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
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="w-[250px] text-slate-700 pl-4">Organization</TableHead>
                  <TableHead className="text-right text-slate-700">Contacts Enrolled</TableHead>
                  <TableHead className="text-right text-slate-700">Total Replies</TableHead>
                  <TableHead className="text-right text-slate-700">Reply Rate</TableHead>
                  <TableHead className="text-right text-slate-700">Meetings Booked</TableHead>
                  <TableHead className="text-right text-slate-700">Active Scenarios</TableHead>
                  <TableHead className="text-right text-slate-700 pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skel-${index}`} className="border-b border-slate-100">
                      <TableCell className="pl-4"><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-12 inline-block" /></TableCell>
                      <TableCell className="text-right pr-4"><Skeleton className="h-8 w-20 inline-block" /></TableCell>
                    </TableRow>
                  ))
                ) : stats.organizations.length > 0 ? (
                  stats.organizations.map((org, idx) => (
                    <TableRow 
                      key={org.id} 
                      className={`hover:bg-slate-50 transition-colors duration-150 border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                    >
                      <TableCell className="font-medium py-3 pl-4">{org.name}</TableCell>
                      <TableCell className="text-right py-3 text-slate-700">{org.stats.contactsEnrolled}</TableCell>
                      <TableCell className="text-right py-3 text-slate-700">{org.stats.totalResponses}</TableCell>
                      <TableCell className={`text-right py-3 ${getReplyRateStyle(org.stats.replyRate)}`}>
                         {org.stats.replyRate === null || org.stats.replyRate === undefined ? '--' : `${org.stats.replyRate.toFixed(1)}%`}
                      </TableCell>
                      <TableCell className="text-right py-3 text-slate-700">
                        {org.stats.meetingsBooked > 0 ? (
                          <span className="font-medium text-emerald-600">{org.stats.meetingsBooked}</span>
                        ) : org.stats.meetingsBooked}
                      </TableCell>
                      <TableCell className="text-right py-3 text-slate-700">{org.stats.activeScenarios}</TableCell>
                      <TableCell className="text-right py-3 pr-4">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTasks(org.name)} 
                          className="h-8 px-3 text-xs"
                        >
                          <Eye className="mr-1 h-3 w-3" /> View Tasks
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground bg-slate-50/30 border-b border-slate-100">
                      No organization data available for the selected period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add a section to display the raw received data */}
      {showReceivedData && receivedTaskData.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center mb-4">
            <div className="h-10 w-1 bg-gradient-to-b from-green-600 to-emerald-600 rounded mr-3"></div>
            <h2 className="text-xl font-semibold text-slate-800">Raw Received Data</h2>
          </div>
          
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="flex justify-between items-center">
                  <span>Tasks in Storage: {receivedTaskData.length}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowReceivedData(false)} 
                    className="h-8 px-2 text-xs text-slate-500"
                  >
                    Hide
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivedTaskData.map((task, index) => (
                    <TableRow key={`raw-${index}`} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono text-xs text-slate-500">{index + 1}</TableCell>
                      <TableCell className="font-medium">{task.taskName}</TableCell>
                      <TableCell>{task.clientName}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn("border", getStatusBadgeClasses(task.status))}
                        >
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.assignedTo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Tasks for: {selectedOrgName}</DialogTitle>
            <DialogDescription>
              Current tasks associated with this organization.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="ml-3 text-slate-600">Loading tasks...</p>
              </div>
            ) : taskError ? (
              <div className="text-center py-10 text-red-600 bg-red-50 border border-red-200 rounded-md px-4">
                <p><strong>Error:</strong> {taskError}</p>
              </div>
            ) : tasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {getTaskField(task, 'taskName', 'Task Name')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn("border", getStatusBadgeClasses(getTaskField(task, 'status', 'Status')))}
                        >
                          {getTaskField(task, 'status', 'Status')}
                        </Badge>
                      </TableCell>
                      <TableCell>{getTaskField(task, 'assignedTo', 'Assigned To')}</TableCell>
                      <TableCell>
                        {getTaskField(task, 'dueDate', 'Due Date') ? 
                          new Date(getTaskField(task, 'dueDate', 'Due Date')).toLocaleDateString() : 
                          'No date'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10 text-slate-500 bg-slate-50 border border-slate-100 rounded-md">
                No tasks found for this organization.
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}