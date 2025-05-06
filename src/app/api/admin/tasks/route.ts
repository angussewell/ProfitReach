import { NextResponse } from 'next/server';
// Correcting auth imports - try standard pattern for server components
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as fs from 'fs';
import * as path from 'path';

// Function to log to a file for debugging
const logToFile = (message: string) => {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logPath = path.join(logDir, 'api-debug.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    fs.appendFileSync(logPath, logEntry);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
};

// Remove old/unused interfaces
/* 
interface Task { // Keeping this commented out for reference - frontend will define structure
  clientName: string;
  taskName: string;
  status: string;
  description: string;
  assignedTo: string;
  order?: number | null;
  dueDate?: string | null; 
}

interface CodaItem {
  id: string;
  type: string;
  href: string;
  name: string;
  index: number;
  createdAt: string;
  updatedAt: string;
  browserLink: string;
  values: any; // Original structure had nested Task here
}

interface CodaResponse {
  items: CodaItem[];
  href?: string;
  nextSyncToken?: string;
}
*/

const N8N_WEBHOOK_URL = 'https://n8n-n8n.swl3bc.easypanel.host/webhook/coda-tasks';
const FETCH_TIMEOUT = 15000; // 15 seconds timeout

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`🟢 [${requestId}] API Route started: /api/admin/tasks`);
  logToFile(`🟢 [${requestId}] API Route started: /api/admin/tasks`);
  
  try {
    // 1. Check Authentication and Authorization
    logToFile(`[${requestId}] Attempting to get session...`);
    console.log(`[${requestId}] Attempting to get session...`);
    const session = await getServerSession(authOptions);
    const hasSession = !!session;
    const isAdmin = session?.user?.role === 'admin';
    
    logToFile(`[${requestId}] Session exists: ${hasSession}, Is admin: ${isAdmin}`);
    console.log(`[${requestId}] Session exists: ${hasSession}, Is admin: ${isAdmin}`);
    
    if (!session || session.user?.role !== 'admin') {
      const errorMsg = `[${requestId}] Authorization failed: Not an admin or no session`;
      console.log(errorMsg);
      logToFile(errorMsg);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // 2. Parse Request Body
    logToFile(`[${requestId}] Parsing request body...`);
    console.log(`[${requestId}] Parsing request body...`);
    let organizationName: string;
    try {
      const body = await request.json();
      logToFile(`[${requestId}] Request body: ${JSON.stringify(body)}`);
      console.log(`[${requestId}] Request body:`, body);
      
      if (!body.organizationName || typeof body.organizationName !== 'string') {
        const errorMsg = `[${requestId}] Invalid request body: Missing or invalid organizationName`;
        console.log(errorMsg);
        logToFile(errorMsg);
        return NextResponse.json({ error: 'Missing or invalid organizationName' }, { status: 400 });
      }
      organizationName = body.organizationName;
      console.log(`[${requestId}] Organization name extracted:`, organizationName);
      logToFile(`[${requestId}] Organization name extracted: ${organizationName}`);
    } catch (error) {
      console.error(`[${requestId}] Error parsing request body:`, error);
      logToFile(`[${requestId}] Error parsing request body: ${error}`);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    // 3. Call External n8n Webhook
    logToFile(`[${requestId}] Preparing to fetch tasks for: ${organizationName}`);
    console.log(`[${requestId}] Preparing to fetch tasks for: ${organizationName}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    
    try {
      logToFile(`[${requestId}] 🔵 EXECUTION MARKER: Starting webhook fetch to ${N8N_WEBHOOK_URL}`);
      console.log(`[${requestId}] 🔵 EXECUTION MARKER: Starting webhook fetch to ${N8N_WEBHOOK_URL}`);
      console.log(`[${requestId}] 🔵 Request payload:`, JSON.stringify({ organizationName }));
      logToFile(`[${requestId}] 🔵 Request payload: ${JSON.stringify({ organizationName })}`);
      
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationName }), 
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      logToFile(`[${requestId}] 🟡 EXECUTION MARKER: Webhook response received with status: ${n8nResponse.status}`);
      console.log(`[${requestId}] 🟡 EXECUTION MARKER: Webhook response received with status: ${n8nResponse.status}`);
      
      const responseHeaders = Object.fromEntries([...n8nResponse.headers.entries()]);
      logToFile(`[${requestId}] 🟡 Response headers: ${JSON.stringify(responseHeaders)}`);
      console.log(`[${requestId}] 🟡 Response headers:`, responseHeaders);
      
      if (!n8nResponse.ok) {
         const errorText = await n8nResponse.text();
         logToFile(`[${requestId}] Error from n8n webhook: ${n8nResponse.status} - ${errorText}`);
         console.error(`[${requestId}] Error from n8n webhook: ${n8nResponse.status} - ${errorText}`);
         return NextResponse.json({ 
           error: `External webhook failed with status ${n8nResponse.status}`,
           details: errorText
         }, { status: 502 });
      }
      
      // 4. Parse and Validate Simplified Response
      let tasks: any[] = []; // Initialize as empty array
      let rawResponseText = "<Raw text not read>"; // Variable to hold raw text
      try {
        // Log raw text first for debugging
        try {
          logToFile(`[${requestId}] 📖 Attempting to read response body as text...`);
          console.log(`[${requestId}] 📖 Attempting to read response body as text...`);
          // Clone the response to read text without consuming the body for .json()
          const responseCloneForText = n8nResponse.clone(); 
          rawResponseText = await responseCloneForText.text();
          logToFile(`[${requestId}]  RAW RESPONSE TEXT: ${rawResponseText}`);
          console.log(`[${requestId}] RAW RESPONSE TEXT:`, rawResponseText);
        } catch (textError: any) {
          logToFile(`[${requestId}] ⚠️ Error reading response body as text: ${textError.message}`);
          console.error(`[${requestId}] ⚠️ Error reading response body as text:`, textError);
          rawResponseText = `<Error reading text: ${textError.message}>`;
        }

        logToFile(`[${requestId}] 🟢 EXECUTION MARKER: About to parse JSON response from webhook (original response)`);
        console.log(`[${requestId}] 🟢 EXECUTION MARKER: About to parse JSON response from webhook (original response)`);
        // Now parse the original response as JSON
        const parsedResponse = await n8nResponse.json(); 
        logToFile(`[${requestId}] ✅ Successfully parsed JSON response from n8n.`);
        console.log(`[${requestId}] ✅ Successfully parsed JSON response from n8n.`);

        // Simple Validation: Check if it's an array
        if (Array.isArray(parsedResponse)) {
          tasks = parsedResponse;
          logToFile(`[${requestId}] ✅ Response is a valid array with ${tasks.length} items.`);
          console.log(`[${requestId}] ✅ Response is a valid array with ${tasks.length} items.`);
        } else {
          logToFile(`[${requestId}] ⚠️ Validation Failed: Parsed response is not an array. Type: ${typeof parsedResponse}`);
          console.warn(`[${requestId}] ⚠️ Validation Failed: Parsed response is not an array. Type: ${typeof parsedResponse}`);
          // tasks remains []
        }

      } catch (parseError: any) {
         // Log the raw text we captured earlier, if available, during parse error
         logToFile(`[${requestId}] Failed to parse JSON response from n8n webhook: ${parseError}. Raw text was: ${rawResponseText}`);
         console.error(`[${requestId}] Failed to parse JSON response from n8n webhook:`, parseError, "Raw text was:", rawResponseText);
         // Return empty array in case of parse error, as frontend expects an array
         logToFile(`[${requestId}] Returning empty array due to JSON parse error.`);
         return NextResponse.json([], { status: 502 }); // Indicate error but return empty array
      }

      // 5. Return the validated (or empty) tasks array
      logToFile(`[${requestId}] 🟠 EXECUTION MARKER: About to return ${tasks.length} tasks to client`);
      console.log(`[${requestId}] 🟠 EXECUTION MARKER: About to return ${tasks.length} tasks to client`);
      return NextResponse.json(tasks);
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      logToFile(`[${requestId}] Error in fetch operation: ${error}`);
      console.error(`[${requestId}] Error in fetch operation:`, error);
      
      let errorMessage = 'An unknown error occurred during fetch';
      let errorDetails = error instanceof Error ? error.message : String(error);
      let status = 500;
      
      if (error.name === 'AbortError') {
        logToFile(`[${requestId}] Fetch aborted due to timeout.`);
        console.log(`[${requestId}] Fetch aborted due to timeout.`);
        errorMessage = 'The request to the external task service timed out.';
        errorDetails = `Timeout after ${FETCH_TIMEOUT}ms`;
        status = 504;
      } else {
        errorMessage = 'Failed to communicate with the external task service';
        status = 502;
      }
      // Return empty array even on fetch errors, as frontend expects array
      logToFile(`[${requestId}] Returning empty array due to fetch error: ${errorMessage}`);
      return NextResponse.json([], { status }); // Indicate error but return empty array
    }
  } catch (outerError: any) {
    // This catches any error in the entire route, including auth or other setup errors
    logToFile(`[${requestId}] CRITICAL ERROR in tasks API route: ${outerError}`);
    console.error(`[${requestId}] CRITICAL ERROR in tasks API route:`, outerError);
    // Return empty array on critical errors
    return NextResponse.json([], { status: 500 }); // Indicate error but return empty array
  }
}
