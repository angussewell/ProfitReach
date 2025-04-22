'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Percent, CalendarCheck, ClipboardList, TrendingUp, Eye, Loader2, Mail, InfoIcon, Calendar as CalendarIcon } from 'lucide-react'; // Added CalendarIcon
import { subDays, startOfDay, endOfDay, format } from 'date-fns'; // Added format
import { DateRangeFilter } from '@/components/filters/date-range-filter';
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
import { EmailInventoryStats } from '@/components/admin/EmailInventoryStats';
import { OrganizationSettingsModal } from '@/components/admin/OrganizationSettingsModal';
import { ElvCreditsWidget } from '@/components/admin/ElvCreditsWidget'; // Import the new ELV widget

import type { DateRange } from "react-day-picker";

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

// Interface for setter stats
interface SetterStat {
  userEmail: string;
  replyCount: number;
}

// Interface for setter stats API response metadata
interface SetterStatsMetadata {
  dateFiltered: boolean;
  organizationId: string;
  startDate?: string;
  endDate?: string;
  totalUsers: number;
  totalReplies?: number;
}

// Interface for setter stats API response
interface SetterStatsResponse {
  data: SetterStat[];
  metadata: SetterStatsMetadata;
}

export default function AdminPanelPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CombinedStats>({ overall: null, organizations: [] });

  // New: Preset filter state
  type Preset = 'today' | '7d' | '14d' | '30d' | 'year' | 'all' | 'custom';
  const [selectedPreset, setSelectedPreset] = useState<Preset>('7d');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [customRangePopoverOpen, setCustomRangePopoverOpen] = useState(false);

  // Main date range state (drives data fetching)
  // For "all time", set to undefined
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  
  // Add new state for setter stats
  const [setterStats, setSetterStats] = useState<SetterStat[]>([]);
  const [setterStatsLoading, setSetterStatsLoading] = useState(false);
  const [setterStatsError, setSetterStatsError] = useState<string | null>(null);

  // Tab state for Organization Breakdown
  const [activeTab, setActiveTab] = useState("contacts");

  // Add new state for metadata
  const [setterStatsMetadata, setSetterStatsMetadata] = useState<SetterStatsMetadata | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false); // This will be removed later
  // const [selectedOrgName, setSelectedOrgName] = useState<string | null>(null); // REMOVED duplicate declaration
  const [tasks, setTasks] = useState<Task[]>([]); // State for tasks data (used within the new modal)
  const [tasksLoading, setTasksLoading] = useState(false); // Loading state for tasks (used within the new modal)
  const [taskError, setTaskError] = useState<string | null>(null); // Error state for tasks (will be used within the new modal)

  // State for the new Organization Settings Modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null); // Store ID for potential future use in modal
  const [selectedOrgName, setSelectedOrgName] = useState<string | null>(null); // Store Name for modal title and task fetching

  // Add a new state to store the raw received data for testing (will be used within the new modal)
  const [receivedTaskData, setReceivedTaskData] = useState<any[]>([]);
  const [showReceivedData, setShowReceivedData] = useState(false);
  
  // Define constants inside the component or globally if needed
  const POLLING_INTERVAL_MS = 2000; // Poll every 2 seconds
  const POLLING_TIMEOUT_MS = 15000; // Timeout after 15 seconds
  const N8N_WEBHOOK_URL = 'https://n8n.srv768302.hstgr.cloud/webhook/coda-tasks';

  // Add new state for debug mode
  const [bypassDateFilter, setBypassDateFilter] = useState(false);
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Move fetchTasksFromServer inside the component as well, as it uses state setters indirectly now via triggerAndPollForTasks
  const fetchTasksFromServer = async (orgName: string): Promise<Task[]> => {
    console.log(`🔍 FRONTEND (fetcher): Fetching tasks for "${orgName}"...`);
    
    const response = await fetch(`/api/admin/tasks-receive?organizationName=${encodeURIComponent(orgName)}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });
    
    console.log(`🔍 FRONTEND (fetcher): Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🔍 FRONTEND (fetcher): Error fetching tasks - Status ${response.status}, Body: ${errorText}`);
      throw new Error(`Failed to fetch tasks: ${response.status} - ${errorText}`);
    }
    
    const fetchedTasks = await response.json();
    
    if (!Array.isArray(fetchedTasks)) {
      console.error(`🔍 FRONTEND (fetcher): Invalid response format - expected array, got ${typeof fetchedTasks}`);
      throw new Error('Invalid response format from server');
    }
    
    console.log(`🔍 FRONTEND (fetcher): Fetched ${fetchedTasks.length} tasks successfully.`);
    return fetchedTasks;
  };

  // New function to trigger n8n and poll for results (Now inside the component)
  const triggerAndPollForTasks = async (orgName: string) => {
    console.log(`🔍 FRONTEND: Starting trigger & poll process for "${orgName}"...`);
    setTasksLoading(true);
    setTaskError(`Triggering task generation for ${orgName}...`);
    setTasks([]); // Clear previous tasks
    setShowReceivedData(true); // Show the data area (even if it's just loading/error)
    setReceivedTaskData([]); // Clear raw data display

    try {
      // Step 1: Trigger the n8n webhook
      console.log(`🔍 FRONTEND: Triggering n8n webhook at ${N8N_WEBHOOK_URL}...`);
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send organization name or any required data to n8n
        body: JSON.stringify({ organizationName: orgName }), 
      });

      if (!n8nResponse.ok) {
        // Handle n8n trigger failure (optional, maybe just log and continue polling)
        console.warn(`🔍 FRONTEND: n8n webhook trigger failed with status ${n8nResponse.status}. Proceeding with polling anyway...`);
        setTaskError(`Webhook trigger failed (status ${n8nResponse.status}). Attempting to poll for existing data...`);
      } else {
        console.log(`🔍 FRONTEND: n8n webhook triggered successfully. Starting polling...`);
        setTaskError(`Tasks requested. Waiting for data (up to ${POLLING_TIMEOUT_MS / 1000}s)...`);
      }

      // Step 2: Start polling
      const startTime = Date.now();
      let tasksFound: Task[] | null = null;

      while (Date.now() - startTime < POLLING_TIMEOUT_MS) {
        console.log(`🔍 FRONTEND: Polling attempt for "${orgName}"...`);
        try {
          // IMPORTANT: Ensure fetchTasksFromServer is defined within component scope or passed
          const fetchedTasks = await fetchTasksFromServer(orgName);
          if (fetchedTasks.length > 0) {
            console.log(`✅ FRONTEND: Polling successful! Found ${fetchedTasks.length} tasks.`);
            tasksFound = fetchedTasks;
            break; // Exit the polling loop
          }
        } catch (pollError) {
          // Log polling errors but continue polling unless it's a fatal error
          console.warn(`🔍 FRONTEND: Polling attempt failed: ${pollError instanceof Error ? pollError.message : String(pollError)}. Retrying...`);
        }

        // Wait before the next poll attempt
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
      }

      // Step 3: Handle results or timeout
      if (tasksFound) {
        setReceivedTaskData(tasksFound);
        setTasks(tasksFound);
        setTaskError(null); // Clear any previous error/loading messages
      } else {
        console.log(`⏳ FRONTEND: Polling timed out after ${POLLING_TIMEOUT_MS / 1000}s for "${orgName}".`);
        setTaskError(`Polling timed out. No tasks received from server after ${POLLING_TIMEOUT_MS / 1000} seconds.`);
        // Optionally use mock data fallback here if needed
        // console.log(`🔍 FRONTEND: Using frontend emergency mock data fallback after timeout`);
        // const emergencyMockData = [...] // Define mock data
        // setReceivedTaskData(emergencyMockData);
        // setTasks(emergencyMockData);
      }

    } catch (error) {
      console.error('❌ FRONTEND: Error during trigger/poll process:', error);
      setTaskError(`Failed to trigger or poll for tasks: ${error instanceof Error ? error.message : String(error)}`);
      setReceivedTaskData([]);
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };
  
  // Browser storage utility functions (These can likely stay outside if they don't use component state/props)
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
      // Handle "All Time" case where dateRange is undefined
      // Also handle initial load where dateRange might be undefined before preset is applied
      if (selectedPreset !== 'all' && (!dateRange?.from || !dateRange?.to)) {
        console.log("Skipping fetch: dateRange not fully defined for non-'all' preset.");
        return;
      }
      setLoading(true);
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
        setStats({ overall: null, organizations: [] });
      } finally {
        setLoading(false);
      }
    };
    
    // Add new function to fetch setter stats
    const fetchSetterStats = async () => {
      // Handle "All Time" case where dateRange is undefined
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
        
        // Add the bypass parameter if enabled
        if (bypassDateFilter) {
          url.searchParams.set('bypass_date_filter', 'true');
        }
        
        const response = await fetch(url, { credentials: 'include' });
        
        // Handle non-OK responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          console.error('Error response from setter-stats API:', errorData);
          
          // Extract detailed error information if available
          const errorMessage = errorData.details?.message || errorData.error || response.statusText;
          throw new Error(`Failed to fetch setter stats: ${errorMessage}`);
        }
        
        // Get the response data with the new structure
        const responseData: SetterStatsResponse = await response.json();
        console.log('Setter stats response:', responseData);
        
        // Check if we have the expected data structure
        if (responseData && 'data' in responseData) {
          setSetterStats(responseData.data || []);
          
          // Store metadata for UI display
          if (responseData.metadata) {
            setSetterStatsMetadata(responseData.metadata);
            
            // Log metadata for debugging
            console.log('Setter stats metadata:', responseData.metadata);
            
            // Optionally show a message if date filtering was bypassed
            if (responseData.metadata.dateFiltered === false) {
              console.log('Note: Date filtering was bypassed, showing all available data');
            }
          }
        } else {
          // Handle legacy or unexpected response format
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
    fetchSetterStats(); // Call the new fetch function
  }, [dateRange, selectedPreset, session, bypassDateFilter]); // Add selectedPreset dependency

  // useEffect for handling modal opening
  useEffect(() => {
    if (isTaskModalOpen && selectedOrgName) {
      console.log(`🔍 FRONTEND: Modal opened for ${selectedOrgName}, calling triggerAndPollForTasks...`);
      triggerAndPollForTasks(selectedOrgName);
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
  // Handle preset selection
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
      case 'today':
        from = startOfDay(today);
        to = endOfDay(today);
        break;
      case '7d':
        from = startOfDay(subDays(today, 6));
        to = endOfDay(today);
        break;
      case '14d':
        from = startOfDay(subDays(today, 13));
        to = endOfDay(today);
        break;
      case '30d':
        from = startOfDay(subDays(today, 29));
        to = endOfDay(today);
        break;
      case 'year':
        from = startOfDay(subDays(today, 364));
        to = endOfDay(today);
        break;
      case 'all':
        // All time: set dateRange to undefined
        setDateRange(undefined);
        return;
      default:
        from = startOfDay(today);
        to = endOfDay(today);
    }
    setDateRange({ from, to }); // Use react-day-picker's DateRange type
  };

  // Simplified calendar selection handler
  const handleCalendarSelect = (range: DateRange | undefined) => {
    // Simply update the customRange state with whatever the calendar provides
    setCustomRange(range);
  };

  // Renamed function to open the new settings modal
  const handleOpenOrgSettingsModal = (orgId: string, orgName: string) => {
    setSelectedOrgId(orgId); // Store the ID
    setSelectedOrgName(orgName); // Store the name
    setIsSettingsModalOpen(true); // Open the new modal
    // We will trigger task fetching inside the new modal component itself
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

  const getReplyRateStyle = (rate: number) => {
    if (rate >= 2) return "text-emerald-600";
    if (rate >= 1) return "text-amber-600";
    return "text-slate-600";
  };

  const getStatusBadgeClasses = (status: string): string => {
    // Add a check to handle undefined or null status gracefully
    if (typeof status !== 'string') {
      console.warn(`🔍 FRONTEND: Received invalid status type: ${typeof status}, value: ${status}. Defaulting badge.`);
      // Return default style if status is not a string
      return 'bg-slate-100 text-slate-700 border-slate-200'; 
    }
    
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
    // Return default style for any other unknown status string
    console.warn(`🔍 FRONTEND: Received unknown status string: ${status}. Defaulting badge.`);
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
        <div className="flex flex-col gap-2 justify-end">
          {/* Preset Button Group */}
          <div className="flex gap-2 mb-1 flex-wrap">
            <Button
              variant={selectedPreset === 'today' ? 'default' : 'outline'}
              onClick={() => handlePresetSelect('today')}
            >
              Today
            </Button>
            <Button
              variant={selectedPreset === '7d' ? 'default' : 'outline'}
              onClick={() => handlePresetSelect('7d')}
            >
              Last 7 days
            </Button>
            <Button
              variant={selectedPreset === '14d' ? 'default' : 'outline'}
              onClick={() => handlePresetSelect('14d')}
            >
              Last 14 days
            </Button>
            <Button
              variant={selectedPreset === '30d' ? 'default' : 'outline'}
              onClick={() => handlePresetSelect('30d')}
            >
              Last 30 days
            </Button>
            <Button
              variant={selectedPreset === 'year' ? 'default' : 'outline'}
              onClick={() => handlePresetSelect('year')}
            >
              Last Year
            </Button>
            <Button
              variant={selectedPreset === 'all' ? 'default' : 'outline'}
              onClick={() => handlePresetSelect('all')}
            >
              All Time
            </Button>
            <Popover open={customRangePopoverOpen} onOpenChange={setCustomRangePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={selectedPreset === 'custom' ? 'default' : 'outline'}
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedPreset === 'custom' && dateRange?.from && dateRange?.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    <span>Custom Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4">
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={handleCalendarSelect}
                    numberOfMonths={2}
                    initialFocus
                  />
                  
                  {/* Text preview of selected range */}
                  {customRange?.from && customRange?.to && (
                    <div className="text-sm text-center py-2 px-2 mt-2 bg-slate-50 rounded border border-slate-200">
                      <span className="font-medium">Selected:</span> {format(customRange.from, "PPP")} - {format(customRange.to, "PPP")}
                    </div>
                  )}
                  
                  {/* Updated button row with Clear and Apply buttons */}
                  <div className="flex justify-between mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomRange(undefined)}
                      disabled={!customRange?.from && !customRange?.to}
                    >
                      Clear
                    </Button>
                    
                    <Button
                      onClick={() => {
                        if (customRange?.from && customRange?.to) {
                          setDateRange({
                            from: startOfDay(customRange.from),
                            to: endOfDay(customRange.to),
                          });
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="replies">Replies</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200"></div>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px] text-slate-700 pl-4">Organization</TableHead>
                      <TableHead className="text-right text-slate-700">Contacts Enrolled</TableHead>
                      <TableHead className="text-right text-slate-700">Active Scenarios</TableHead>
                      <TableHead className="text-right text-slate-700 pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skel-contacts-${index}`} className="border-b border-slate-100">
                          <TableCell className="pl-4"><Skeleton className="h-5 w-3/4" /></TableCell>
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
                          <TableCell className="text-right py-3 text-slate-700">{org.stats?.contactsEnrolled ?? '--'}</TableCell>
                          <TableCell className="text-right py-3 text-slate-700">{org.stats?.activeScenarios ?? '--'}</TableCell>
                          <TableCell className="text-right py-3 pr-4">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenOrgSettingsModal(org.id, org.name)}
                              className="h-8 px-3 text-xs"
                            >
                              <Eye className="mr-1 h-3 w-3" /> Settings
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground bg-slate-50/30 border-b border-slate-100">
                          No organization data available for the selected period.
                        </TableCell>
                      </TableRow>
                    )}
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
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px] text-slate-700 pl-4">Organization</TableHead>
                      <TableHead className="text-right text-slate-700">Total Replies</TableHead>
                      <TableHead className="text-right text-slate-700">Reply Rate (%)</TableHead>
                      <TableHead className="text-right text-slate-700 pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skel-replies-${index}`} className="border-b border-slate-100">
                          <TableCell className="pl-4"><Skeleton className="h-5 w-3/4" /></TableCell>
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
                          <TableCell className="text-right py-3 text-slate-700">{org.stats?.totalResponses ?? '--'}</TableCell>
                          <TableCell className="text-right py-3 text-slate-700">
                            {org.stats?.replyRate !== undefined && org.stats?.replyRate !== null
                              ? `${org.stats.replyRate.toFixed(1)}%`
                              : '--'}
                          </TableCell>
                          <TableCell className="text-right py-3 pr-4">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenOrgSettingsModal(org.id, org.name)}
                              className="h-8 px-3 text-xs"
                            >
                              <Eye className="mr-1 h-3 w-3" /> Settings
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground bg-slate-50/30 border-b border-slate-100">
                          No organization data available for the selected period.
                        </TableCell>
                      </TableRow>
                    )}
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
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px] text-slate-700 pl-4">Organization</TableHead>
                      <TableHead className="text-right text-slate-700">Meetings Booked</TableHead>
                      <TableHead className="text-right text-slate-700">Booking Rate (%)</TableHead>
                      <TableHead className="text-right text-slate-700">Reply-to-Booking Rate (%)</TableHead>
                      <TableHead className="text-right text-slate-700 pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skel-bookings-${index}`} className="border-b border-slate-100">
                          <TableCell className="pl-4"><Skeleton className="h-5 w-3/4" /></TableCell>
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
                          <TableCell className="text-right py-3 text-slate-700">{org.stats?.meetingsBooked ?? '--'}</TableCell>
                          <TableCell className="text-right py-3 text-slate-700">
                            {org.stats?.bookingRate !== undefined && org.stats?.bookingRate !== null
                              ? `${org.stats.bookingRate.toFixed(1)}%`
                              : '--'}
                          </TableCell>
                          <TableCell className="text-right py-3 text-slate-700">
                            {org.stats?.replyToBookingRate !== undefined && org.stats?.replyToBookingRate !== null
                              ? `${org.stats.replyToBookingRate.toFixed(1)}%`
                              : '--'}
                          </TableCell>
                          <TableCell className="text-right py-3 pr-4">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenOrgSettingsModal(org.id, org.name)}
                              className="h-8 px-3 text-xs"
                            >
                              <Eye className="mr-1 h-3 w-3" /> Settings
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground bg-slate-50/30 border-b border-slate-100">
                          No organization data available for the selected period.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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

      {/* Email Account Inventory Section */}
      <div className="mt-8">
        <EmailInventoryStats />
      </div>

      {/* Setter Statistics Card */}
      <div className="mt-8">
        <div className="flex items-center mb-4">
          <div className="h-10 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 rounded mr-3"></div>
          <h2 className="text-xl font-semibold text-slate-800">Setter Statistics</h2>
        </div>
        
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 pb-2">
            <CardTitle className="text-base font-medium">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-indigo-500" />
                  <span>Reply Statistics by User</span>
                </div>
                
                {isDevelopment && (
                  <div className="flex items-center text-xs">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bypassDateFilter}
                        onChange={() => setBypassDateFilter(!bypassDateFilter)}
                        className="sr-only peer"
                      />
                      <div className="relative w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-blue-500 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                      <span className="ms-2 text-xs text-gray-500">
                        Bypass Date Filter
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {setterStatsLoading ? (
              <div className="py-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`skel-setter-${index}`} className="flex justify-between items-center py-3 border-b border-slate-100">
                    <Skeleton className="h-5 w-[200px]" />
                    <Skeleton className="h-5 w-[60px]" />
                  </div>
                ))}
              </div>
            ) : setterStatsError ? (
              <div className="py-6 text-center text-red-500">
                <p>{setterStatsError}</p>
              </div>
            ) : setterStats.length > 0 ? (
              <>
                {setterStatsMetadata && !setterStatsMetadata.dateFiltered && (
                  <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm">
                    <InfoIcon className="inline-block h-4 w-4 mr-1" />
                    Note: Showing all available data (date filtering was bypassed or no data found in the selected date range).
                  </div>
                )}
                
                {setterStatsMetadata && (
                  <div className="mb-4 text-sm text-slate-500">
                    <p>Total users with replies: <span className="font-medium">{setterStatsMetadata.totalUsers}</span></p>
                    {setterStatsMetadata.totalReplies !== undefined && (
                      <p>Total replies sent: <span className="font-medium">{setterStatsMetadata.totalReplies}</span></p>
                    )}
                  </div>
                )}
                
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/80 border-b border-slate-200">
                      <TableHead className="text-slate-700 pl-4">User Email</TableHead>
                      <TableHead className="text-right text-slate-700 pr-4">Replies Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {setterStats.map((stat, idx) => (
                      <TableRow 
                        key={`setter-${idx}`}
                        className={`hover:bg-slate-50 transition-colors duration-150 border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                      >
                        <TableCell className="font-medium py-3 pl-4">{stat.userEmail}</TableCell>
                        <TableCell className="text-right py-3 pr-4 font-semibold text-indigo-600">
                          {stat.replyCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>No reply data available for the selected period.</p>
                <p className="text-sm mt-1">Replies will be tracked when users respond to messages.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* EmailListVerify Credits Widget Section */}
      <div className="mt-8">
        <ElvCreditsWidget />
      </div>

      {/* Render the new Organization Settings Modal */}
      {selectedOrgId && selectedOrgName && (
        <OrganizationSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          organizationId={selectedOrgId}
          organizationName={selectedOrgName}
          // Pass task-related state and functions needed inside the modal
          tasks={tasks}
          tasksLoading={tasksLoading}
          taskError={taskError}
          triggerAndPollForTasks={triggerAndPollForTasks}
          receivedTaskData={receivedTaskData}
          showReceivedData={showReceivedData}
          setShowReceivedData={setShowReceivedData}
          getStatusBadgeClasses={getStatusBadgeClasses} // Pass helper if needed inside
          getTaskField={getTaskField} // Pass helper if needed inside
        />
      )}
    </div>
  );
}
