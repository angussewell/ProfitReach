import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from 'fs';
import path from 'path';

// Define the storage file path using /tmp directory which is writable in serverless environments
const STORAGE_DIR = process.env.NODE_ENV === 'production' ? '/tmp' : './tmp';
const getStorageFilePath = (orgName: string) => {
  // Sanitize the organization name for safe file naming
  const sanitizedName = orgName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return path.join(STORAGE_DIR, `tasks_${sanitizedName}.json`);
};

// Make sure the storage directory exists
try {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    console.log(`Created storage directory: ${STORAGE_DIR}`);
  }
} catch (error) {
  console.error(`Failed to create storage directory: ${error}`);
}

// File-based storage utility for persisting tasks
const fileStorage = {
  storeTasks: (organizationName: string, tasks: any[]): boolean => {
    try {
      const filePath = getStorageFilePath(organizationName);
      fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf8');
      console.log(`Stored ${tasks.length} tasks for ${organizationName} at ${filePath}`);
      
      // Verify the file exists after writing
      const exists = fs.existsSync(filePath);
      const stats = exists ? fs.statSync(filePath) : null;
      console.log(`File verification: exists=${exists}, size=${stats ? stats.size : 'N/A'} bytes`);
      
      return true;
    } catch (error) {
      console.error(`Failed to store tasks for ${organizationName}:`, error);
      return false;
    }
  },
  
  getTasks: (organizationName: string): any[] => {
    try {
      const filePath = getStorageFilePath(organizationName);
      
      if (!fs.existsSync(filePath)) {
        console.log(`No stored tasks file found for ${organizationName} at ${filePath}`);
        return [];
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Check if the file has content
      if (!fileContent || fileContent.trim() === '') {
        console.log(`Empty tasks file for ${organizationName}`);
        return [];
      }
      
      const stats = fs.statSync(filePath);
      console.log(`Reading tasks for ${organizationName}: file size=${stats.size} bytes`);
      
      // Parse the JSON data
      const tasks = JSON.parse(fileContent);
      console.log(`Retrieved ${tasks.length} tasks for ${organizationName} from ${filePath}`);
      return Array.isArray(tasks) ? tasks : [];
    } catch (error) {
      console.error(`Failed to retrieve tasks for ${organizationName}:`, error);
      return [];
    }
  }
};

// Debug utility to print object structure
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

// Endpoint for n8n to push task data to
export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`🟢 [${requestId}] API Route started: /api/admin/tasks-receive (POST)`);
  console.log(`🟢 [${requestId}] Storage directory: ${STORAGE_DIR}`);
  console.log(`🟢 [${requestId}] This endpoint is PUBLIC and does NOT require authentication for webhooks`);
  
  try {
    // Get the raw text for debugging
    const clonedRequest = request.clone();
    const rawText = await clonedRequest.text();
    console.log(`[${requestId}] Raw request body (first 300 chars): ${rawText.substring(0, 300)}...`);
    
    // Parse the incoming data - could be array or object
    let data: any;
    
    try {
      data = JSON.parse(rawText);
      console.log(`[${requestId}] Successfully parsed JSON data`);
      debugObject(data, `[${requestId}] Parsed data:`);
    } catch (parseError) {
      console.error(`[${requestId}] Error parsing JSON:`, parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON', 
        details: parseError instanceof Error ? parseError.message : String(parseError) 
      }, { status: 400 });
    }
    
    // Handle different data structures
    let organizationName: string = '';
    let tasks: any[] = [];
    
    // Case 1: Direct object with organizationName and tasks
    if (typeof data === 'object' && !Array.isArray(data) && data.organizationName && Array.isArray(data.tasks)) {
      console.log(`[${requestId}] Processing direct object format`);
      organizationName = data.organizationName;
      tasks = data.tasks;
    }
    // Case 2: Array with a single object element
    else if (Array.isArray(data) && data.length > 0) {
      console.log(`[${requestId}] Processing array format`);
      // Try to extract from first element
      const firstItem = data[0];
      debugObject(firstItem, `[${requestId}] First array item:`);
      
      if (typeof firstItem === 'object' && firstItem.organizationName) {
        organizationName = firstItem.organizationName;
        
        // Check if tasks is directly in the first item
        if (Array.isArray(firstItem.tasks)) {
          console.log(`[${requestId}] Found tasks array in first item`);
          tasks = firstItem.tasks;
        }
        // Check if the first item itself is a task or if we need to use the whole array as tasks
        else if (firstItem.taskName || firstItem.clientName) {
          console.log(`[${requestId}] Using entire array as tasks`);
          tasks = data;
        }
      }
      // If the array itself contains task objects directly
      else if (typeof firstItem === 'object' && (firstItem.taskName || firstItem.clientName)) {
        console.log(`[${requestId}] Array contains direct task objects`);
        // Extract organization name from first task's clientName
        if (firstItem.clientName) {
          organizationName = firstItem.clientName;
        }
        tasks = data;
      }
    }
    
    // Final validation
    if (!organizationName) {
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
    
    console.log(`[${requestId}] Extracted organization: ${organizationName}, Tasks count: ${tasks.length}`);
    if (tasks.length > 0) {
      console.log(`[${requestId}] First task sample:`, JSON.stringify(tasks[0]).substring(0, 300));
    }
    
    // Store the tasks in our file storage
    const stored = fileStorage.storeTasks(organizationName, tasks);
    
    if (!stored) {
      console.error(`[${requestId}] Failed to store tasks in file storage`);
      return NextResponse.json({ 
        error: 'Storage failure', 
        details: 'Failed to save tasks to persistent storage' 
      }, { status: 500 });
    }
    
    // Verify storage worked by reading it back
    const verifyTasks = fileStorage.getTasks(organizationName);
    console.log(`[${requestId}] Verification read returned ${verifyTasks.length} tasks`);
    
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
  console.log(`🟢 [${requestId}] Storage directory: ${STORAGE_DIR}`);
  
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
    
    // Check directory contents for debugging
    try {
      const dirContents = fs.readdirSync(STORAGE_DIR);
      console.log(`[${requestId}] Storage directory contents: ${dirContents.join(', ')}`);
    } catch (dirError) {
      console.error(`[${requestId}] Failed to read storage directory:`, dirError);
    }
    
    // Retrieve tasks for this organization
    const tasks = fileStorage.getTasks(organizationName);
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