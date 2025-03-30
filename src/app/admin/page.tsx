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
  
  // Browser storage utility functions
  const getTasksFromLocalStorage = (orgName: string): any[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const key = `tasks_${orgName.replace(/[^a-z0-9]/gi, '_')}`;
      const storedData = localStorage.getItem(key);
      
      if (!storedData) return [];
      
      const parsedData = JSON.parse(storedData);
      console.log(`🔍 FRONTEND: Retrieved ${Array.isArray(parsedData) ? parsedData.length : 0} tasks from localStorage for ${orgName}`);
      
      return Array.isArray(parsedData) ? parsedData : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  };
  
  const clearTasksFromLocalStorage = (orgName: string): void => {
    if (typeof window === 'undefined') return;
    
    try {
      const key = `tasks_${orgName.replace(/[^a-z0-9]/gi, '_')}`;
      localStorage.removeItem(key);
      console.log(`🔍 FRONTEND: Cleared tasks from localStorage for ${orgName}`);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  };
  
  // Revert function name and logic
  // Function to check client-side stored data
  const checkBrowserStorage = async (orgName: string) => {
    console.log(`🔍 FRONTEND: Checking browser storage for \"${orgName}\"...`);
    setTasksLoading(true);
    setShowReceivedData(true);
    setTaskError(null); // Clear previous errors
    setTasks([]); // Clear previous tasks

    try {
      // Restore logic to ONLY check localStorage
      const storedTasks = getTasksFromLocalStorage(orgName);

      if (storedTasks.length > 0) {
        console.log(`🔍 FRONTEND: Found ${storedTasks.length} tasks in browser storage`);
        setReceivedTaskData(storedTasks);
        setTasks(storedTasks); // Update tasks state for the modal
        setTaskError(`Found ${storedTasks.length} tasks in browser storage for ${orgName}`);
      } else {
        console.log(`🔍 FRONTEND: No tasks found in browser storage`);
        setReceivedTaskData([]);
        setTaskError(`No tasks found in browser storage for ${orgName}`);
      }
    } catch (error) {
      console.error('🔍 FRONTEND: Error checking browser storage:', error);
      setTaskError(`Error checking browser storage: ${error instanceof Error ? error.message : String(error)}`);
      setReceivedTaskData([]);
    } finally {
      setTasksLoading(false);
    }
  };

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

  // Simplified fetch task function with improved fallback chain
  const fetchTasks = async () => {
    if (!selectedOrgName) return;
    
    console.log(`🔍 FRONTEND: Starting task fetch for "${selectedOrgName}"`);
    setTasksLoading(true);
    setTasks([]);
    setTaskError(null);
    
    // Track whether we successfully got tasks from any source
    let gotTasks = false;
    
    // Try original endpoint first
    try {
      console.log(`🔍 FRONTEND: Trying original tasks endpoint...`);
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationName: selectedOrgName }),
      });
      
      if (!response.ok) {
        console.log(`🔍 FRONTEND: Original endpoint returned ${response.status}`);
        throw new Error(`Original endpoint failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`🔍 FRONTEND: Original endpoint returned:`, data);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`🔍 FRONTEND: Original endpoint returned ${data.length} tasks`);
        setTasks(data);
        gotTasks = true;
      } else {
        console.log(`🔍 FRONTEND: Original endpoint returned empty array or invalid format`);
        throw new Error('No tasks received from original endpoint');
      }
    } catch (error) {
      console.log(`🔍 FRONTEND: Original endpoint failed:`, error);
      
      // Try new push architecture endpoint
      try {
        console.log(`🔍 FRONTEND: Trying new tasks-receive endpoint...`);
        const response = await fetch(`/api/admin/tasks-receive?organizationName=${encodeURIComponent(selectedOrgName)}`, {
          method: 'GET',
        });
        
        if (!response.ok) {
          console.log(`🔍 FRONTEND: New endpoint returned ${response.status}`);
          throw new Error(`New endpoint failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`🔍 FRONTEND: New endpoint returned:`, data);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log(`🔍 FRONTEND: New endpoint returned ${data.length} tasks`);
          setTasks(data);
          gotTasks = true;
        } else {
          console.log(`🔍 FRONTEND: New endpoint returned empty array or invalid format`);
          throw new Error('No tasks received from new endpoint');
        }
      } catch (newEndpointError) {
        console.log(`🔍 FRONTEND: New endpoint failed:`, newEndpointError);
        
        // Try mock endpoint as last resort
        try {
          console.log(`🔍 FRONTEND: Trying mock tasks endpoint...`);
          const response = await fetch('/api/admin/mock-tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ organizationName: selectedOrgName }),
          });
          
          if (!response.ok) {
            console.log(`🔍 FRONTEND: Mock endpoint returned ${response.status}`);
            throw new Error(`Mock endpoint failed: ${response.status}`);
          }
          
          const data = await response.json();
          console.log(`🔍 FRONTEND: Mock endpoint returned:`, data);
          
          if (Array.isArray(data) && data.length > 0) {
            console.log(`🔍 FRONTEND: Using ${data.length} mock tasks as fallback`);
            setTasks(data);
            setTaskError("Using mock data - real endpoints failed or returned no data");
            gotTasks = true;
          } else {
            console.log(`🔍 FRONTEND: Mock endpoint returned empty array or invalid format`);
            throw new Error('No tasks received from mock endpoint');
          }
        } catch (mockError) {
          console.log(`🔍 FRONTEND: All endpoints failed`);
          setTaskError(`Could not load tasks from any source. Please try again later.`);
        }
      }
    } finally {
      setTasksLoading(false);
      
      // Final check to make sure we display a message if no tasks were found
      if (!gotTasks) {
        console.log(`🔍 FRONTEND: No tasks were found from any source`);
        setTaskError("No tasks found for this organization");
      }
    }
  };

  // Replace the current useEffect for handling modal opening with one that checks localStorage first
  useEffect(() => {
    if (isTaskModalOpen && selectedOrgName) {
      // Try to get tasks from localStorage first
      const storedTasks = getTasksFromLocalStorage(selectedOrgName);
      
      if (storedTasks.length > 0) {
        console.log(`🔍 FRONTEND: Using ${storedTasks.length} tasks from localStorage`);
        setTasks(storedTasks);
        setTaskError(null);
        setTasksLoading(false);
      } else {
        // Fall back to API if no localStorage data
        fetchTasks();
      }
    }
  }, [isTaskModalOpen, selectedOrgName]);

  // Check for URL parameters on page load indicating tasks were just received
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tasksReceived = params.get('tasksReceived');
      const org = params.get('org');
      const count = params.get('count');

      if (tasksReceived === 'true' && org) {
        console.log(`🔍 FRONTEND: Detected tasks received for ${org} (${count} tasks)`);
        // Clear the URL parameters without full reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        // Show notification
        toast.success(`Successfully received ${count} tasks for ${org}! Data is stored locally.`);

        // Optionally, open the modal or directly display data by checking localStorage
        setSelectedOrgName(org); // Set org name if needed for other actions
        // Trigger checkBrowserStorage to load data into state immediately
        checkBrowserStorage(org);
        // Optionally open modal: setIsTaskModalOpen(true);
      }
    }
  }, []); // Run only on mount

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
      const response = await fetch(`/api/admin/tasks-receive?organizationName=${encodeURIComponent(orgName)}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        console.error(`🔍 FRONTEND: Error fetching tasks - Status ${response.status}`);
        setTaskError(`Error fetching tasks: ${response.statusText}`);
        setReceivedTaskData([]);
        setTasks([]);
      } else {
        const fetchedTasks = await response.json();
        console.log(`🔍 FRONTEND: Fetched ${fetchedTasks.length} tasks from server`);
        
        if (Array.isArray(fetchedTasks) && fetchedTasks.length > 0) {
          setReceivedTaskData(fetchedTasks);
          setTasks(fetchedTasks);
          setTaskError(`Successfully fetched ${fetchedTasks.length} tasks from server for ${orgName}`);
        } else {
          console.log(`🔍 FRONTEND: No tasks found on server`);
          setReceivedTaskData([]);
          setTasks([]);
          setTaskError(`No tasks found on server for ${orgName}. 
            Make sure the n8n webhook has been triggered recently.`);
        }
      }
    } catch (error) {
      console.error('🔍 FRONTEND: Error fetching tasks:', error);
      setTaskError(`Error fetching tasks: ${error instanceof Error ? error.message : String(error)}`);
      setReceivedTaskData([]);
      setTasks([]);
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