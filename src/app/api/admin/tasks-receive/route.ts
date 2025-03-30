import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// In-memory storage solution (will reset on server restart)
// Map organization names to their task data
const organizationTasksStore: Map<string, any[]> = new Map();

// Utility to get tasks by organization name
const getTasks = (organizationName: string): any[] => {
  return organizationTasksStore.get(organizationName) || [];
};

// Utility to store tasks for an organization
const storeTasks = (organizationName: string, tasks: any[]): void => {
  organizationTasksStore.set(organizationName, tasks);
  console.log(`Stored ${tasks.length} tasks for organization: ${organizationName}`);
};

// Endpoint for n8n to push task data to
export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`🟢 [${requestId}] API Route started: /api/admin/tasks-receive`);
  
  try {
    // Parse the incoming data
    const data = await request.json();
    console.log(`[${requestId}] Received data payload.`);
    
    // Validate the structure
    if (!data || !data.organizationName || !Array.isArray(data.tasks)) {
      console.error(`[${requestId}] Invalid data structure. Expected: { organizationName: string, tasks: Array }`);
      return NextResponse.json({ 
        error: 'Invalid data structure', 
        details: 'Expected { organizationName: string, tasks: Array }' 
      }, { status: 400 });
    }
    
    const { organizationName, tasks } = data;
    console.log(`[${requestId}] Received ${tasks.length} tasks for organization: ${organizationName}`);
    
    // Store the tasks in our in-memory store
    storeTasks(organizationName, tasks);
    
    // Return success
    return NextResponse.json({ 
      success: true, 
      message: `Successfully stored ${tasks.length} tasks for ${organizationName}` 
    });
  } catch (error) {
    console.error(`[${requestId}] Error processing task data:`, error);
    return NextResponse.json({ 
      error: 'Failed to process data', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// Endpoint for frontend to retrieve stored task data
export async function GET(request: Request) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`🟢 [${requestId}] API Route GET started: /api/admin/tasks-receive`);
  
  try {
    // Check auth - only admins can retrieve tasks
    console.log(`[${requestId}] Checking authentication...`);
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
    
    // Retrieve tasks for this organization
    const tasks = getTasks(organizationName);
    console.log(`[${requestId}] Retrieved ${tasks.length} tasks for organization: ${organizationName}`);
    
    // Return the tasks array
    return NextResponse.json(tasks);
  } catch (error) {
    console.error(`[${requestId}] Error retrieving task data:`, error);
    return NextResponse.json({ 
      error: 'Failed to retrieve data', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 