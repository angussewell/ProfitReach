import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`🟢 [${requestId}] API Route started: /api/admin/tasks-browser-store (POST)`);
  
  try {
    // Get the raw text for debugging
    const clonedRequest = request.clone();
    const rawText = await clonedRequest.text();
    console.log(`[${requestId}] Raw request body (first 300 chars): ${rawText.substring(0, 300)}...`);
    
    // Parse the JSON data
    let data;
    let tasks = [];
    let organizationName = "Unknown";
    
    try {
      data = JSON.parse(rawText);
      console.log(`[${requestId}] Successfully parsed JSON data`);
      
      // Extract data based on structure
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        // It's an array of tasks
        tasks = data;
        // Try to get organization name from the first task
        if (data[0].clientName) {
          organizationName = data[0].clientName;
        }
      } 
      else if (!Array.isArray(data) && data.tasks && Array.isArray(data.tasks)) {
        // It's an object with tasks array
        tasks = data.tasks;
        if (data.organizationName) {
          organizationName = data.organizationName;
        }
      }
      else if (Array.isArray(data) && data.length > 0 && data[0].organizationName && data[0].tasks) {
        // It's an array with a wrapper object
        organizationName = data[0].organizationName;
        tasks = data[0].tasks;
      }
    } catch (parseError) {
      console.error(`[${requestId}] Error parsing JSON:`, parseError);
    }
    
    // Create a JSON string of the tasks to embed in the HTML
    const tasksJson = JSON.stringify(tasks);
    const tasksCount = tasks.length;
    
    // Build HTML response that will store data in localStorage and show confirmation
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tasks Data Received</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .success {
            background-color: #d4edda;
            border-color: #c3e6cb;
            color: #155724;
          }
          h1 {
            font-size: 24px;
            margin-bottom: 10px;
          }
          .info {
            font-size: 16px;
            margin-bottom: 15px;
          }
          button {
            background-color: #4a5568;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          button:hover {
            background-color: #2d3748;
          }
          pre {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            overflow: auto;
            font-size: 13px;
            max-height: 300px;
          }
          .task-count {
            font-weight: bold;
            font-size: 20px;
          }
        </style>
      </head>
      <body>
        <div class="card success">
          <h1>Data Received Successfully!</h1>
          <p class="info">
            Received <span class="task-count">${tasksCount}</span> tasks for <strong>${organizationName}</strong>
          </p>
          <button onclick="redirectToAdmin()">Return to Admin Panel</button>
        </div>
        
        <div class="card">
          <h1>Data Preview</h1>
          <pre id="data-preview"></pre>
        </div>
        
        <script>
          // Store the tasks data in localStorage
          const tasksData = ${tasksJson};
          // Pass raw org name to JS, escape quotes if necessary for JS string literal
          const orgNameJS = "${organizationName.replace(/"/g, '\\"')}"; 

          // Format and display the data
          const pre = document.getElementById('data-preview');
          pre.textContent = JSON.stringify(tasksData, null, 2);

          // Correctly calculate the sanitized key *in JavaScript* using string concatenation
          const storageKey = 'tasks_' + orgNameJS.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          localStorage.setItem(storageKey, JSON.stringify(tasksData));
          console.log('Tasks data stored in localStorage under key:', storageKey);

          // Function to redirect back to admin panel
          function redirectToAdmin() {
            // Ensure organizationName is properly encoded for the URL, use concatenation
            window.location.href = '/admin?tasksReceived=true&org=' + encodeURIComponent(orgNameJS) + '&count=${tasksCount}';
          }

          // Auto-redirect after 5 seconds
          setTimeout(redirectToAdmin, 5000);
        </script>
      </body>
      </html>
    `;
    
    // Return the HTML page
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Error processing task data:`, error);
    return NextResponse.json({ 
      error: 'Failed to process data', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 