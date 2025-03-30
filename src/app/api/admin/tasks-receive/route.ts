import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// In-memory cache - WARNING: This is unreliable in a serverless environment
// but should work for a simple use case with low traffic
// Store tasks with timestamps to expire old data
interface CachedTasks {
  tasks: any[];
  timestamp: number;
}

let tasksCache: Record<string, CachedTasks> = {};

// How long to keep tasks in memory (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;

// Debug utility function for object inspection
const debugObject = (obj: any, prefix = ''): void => {
  console.log(`${prefix} Type: ${typeof obj}`);
  console.log(`${prefix} Is Array: ${Array.isArray(obj)}`);
  if (obj) {
    console.log(`${prefix} Keys: ${Object.keys(obj).join(', ')}`);
    console.log(`${prefix} Raw: ${JSON.stringify(obj).substring(0, 300)}...`);
  } else {
    console.log(`${prefix} Value: ${obj}`);
  }
};

// Clean up expired cache entries
const cleanupCache = () => {
  const now = Date.now();
  Object.keys(tasksCache).forEach(key => {
    if (now - tasksCache[key].timestamp > CACHE_TTL_MS) {
      console.log(`[Cache] Cleaning up expired tasks for: ${key}`);
      delete tasksCache[key];
    }
  });
};

// Endpoint for n8n to push task data to
export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`🟢 [${requestId}] API Route started: /api/admin/tasks-receive (POST)`);
  
  try {
    // Get the request body
    const rawText = await request.text();
    
    // Parse JSON
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error(`[${requestId}] Error parsing JSON:`, parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON', 
        details: parseError instanceof Error ? parseError.message : String(parseError) 
      }, { status: 400 });
    }
    
    // Extract organization name and tasks from various formats
    let organizationName: string = '';
    let tasks: any[] = [];
    
    // Case 1: Direct object with organizationName and tasks array
    if (typeof data === 'object' && !Array.isArray(data) && data.organizationName && Array.isArray(data.tasks)) {
      organizationName = data.organizationName;
      tasks = data.tasks;
    }
    // Case 2: Array of tasks
    else if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      
      // Try to find organization name in common fields
      organizationName = 
        firstItem?.organizationName || 
        firstItem?.clientName || 
        'Unknown Organization';
      
      // If tasks are directly in the array
      tasks = data;
      
      // If tasks are nested in the first item
      if (Array.isArray(firstItem?.tasks)) {
        tasks = firstItem.tasks;
      }
    }
    
    // Validate extracted data
    if (!organizationName || organizationName === 'Unknown Organization') {
      console.error(`[${requestId}] Could not determine organization name from data`);
      return NextResponse.json({ 
        error: 'Missing organization name', 
        details: 'Could not extract organization name from the provided data' 
      }, { status: 400 });
    }
    
    if (!Array.isArray(tasks) || tasks.length === 0) {
      console.error(`[${requestId}] No valid tasks array found in data`);
      return NextResponse.json({ 
        error: 'Missing tasks', 
        details: 'Could not extract tasks array from the provided data' 
      }, { status: 400 });
    }
    
    console.log(`[${requestId}] Extracted: ${organizationName}, ${tasks.length} tasks`);
    
    // Clean up expired entries before adding new ones
    cleanupCache();
    
    // Store in memory cache
    tasksCache[organizationName] = {
      tasks: tasks,
      timestamp: Date.now()
    };
    
    // Log what we've stored
    console.log(`[${requestId}] Stored ${tasks.length} tasks for ${organizationName} in memory`);
    console.log(`[${requestId}] Current cache keys: ${Object.keys(tasksCache).join(', ')}`);
    
    // Return success
    return NextResponse.json({
      success: true,
      message: `Successfully received ${tasks.length} tasks for ${organizationName}`,
      organization: organizationName,
      count: tasks.length
    });
  } catch (error) {
    console.error(`[${requestId}] Error processing tasks:`, error);
    return NextResponse.json({ 
      error: 'Failed to process request', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// Endpoint for frontend to retrieve stored task data
export async function GET(request: Request) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`🟢 [${requestId}] API Route started: /api/admin/tasks-receive (GET)`);
  
  try {
    // Check auth - only admins can retrieve tasks
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      console.log(`[${requestId}] Authorization failed: Not an admin or no session`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get the organization name from URL parameters
    const url = new URL(request.url);
    const organizationName = url.searchParams.get('organizationName');
    
    if (!organizationName) {
      console.log(`[${requestId}] Missing organizationName parameter`);
      return NextResponse.json({ 
        error: 'Missing parameter', 
        details: 'organizationName parameter is required' 
      }, { status: 400 });
    }
    
    // Clean up expired cache entries
    cleanupCache();
    
    // Get tasks from cache
    const cachedData = tasksCache[organizationName];
    
    if (!cachedData) {
      console.log(`[${requestId}] No cached tasks found for ${organizationName}`);
      return NextResponse.json([]);
    }
    
    console.log(`[${requestId}] Retrieved ${cachedData.tasks.length} tasks for ${organizationName}`);
    console.log(`[${requestId}] Tasks age: ${Math.round((Date.now() - cachedData.timestamp) / 1000)} seconds`);
    
    // Return the tasks array
    return NextResponse.json(cachedData.tasks);
  } catch (error) {
    console.error(`[${requestId}] Error retrieving task data:`, error);
    return NextResponse.json({ 
      error: 'Failed to retrieve data', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 