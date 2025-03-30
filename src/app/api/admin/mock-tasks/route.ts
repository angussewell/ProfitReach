import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Mock data in the exact format expected by the frontend
const MOCK_TASKS = [
  {
    "clientName": "Scale Your Cause",
    "taskName": "Create Initial Scenarios",
    "status": "Done",
    "description": "Engagement Strategy:\nHere's exactly how I think the email outreach should flow:\nThe email would start with: \"Hey, my name is Sarah (or whatever your name is). I work with Scale Your Cause. I saw we were both connected to XYZ Mutual Connection, so I thought I'd reach out.\"\nThen you'd continue with something like: \"We've been seeing a lot of other food shelters (or whatever their nonprofit type is) in Austin (or whatever their city is) such as Competitor 1 and Competitor 2 using the Google Ads grant and signing up for the Google Ads grant. So we've decided to shift our focus to food nonprofits (or whatever their type of nonprofit is).\"\nNext, you'd mention: \"We're having a few open spots this month for our Google Ad Grant giveaway where we're basically setting up Google Ad Grant for a few non-profits completely for no cost at all.\"\nThen you'd ask: \"Do you know anybody that might be interested in something like this?\" This is important because you want to frame it as an open-handed question.\nYou'd personalize it with: \"Since you're [title] in this, since you have a background in this, since you (personalized aspect of why you are reaching out) I thought you were the person to reach out to.\"\nThat's the exact approach - very conversational, referencing mutual connections, mentioning competitors, offering limited spots for free setup, and asking who they might know who could benefit rather than directly selling to them.\n",
    "assignedTo": "Iheoma Nwanyanwu",
    "order": null,
    "dueDate": "2025-03-30T15:48:01.000Z"
  },
  {
    "clientName": "Scale Your Cause",
    "taskName": "Avatar Research",
    "status": "Done",
    "description": "",
    "assignedTo": "CINDY BERMOY",
    "order": null,
    "dueDate": "2025-03-26T15:48:01.000Z"
  },
  {
    "clientName": "Scale Your Cause",
    "taskName": "Create Organization",
    "status": "Done",
    "description": "No Description",
    "assignedTo": "Iheoma Nwanyanwu",
    "order": 1,
    "dueDate": "2025-03-23T15:48:01.000Z"
  },
  {
    "clientName": "Scale Your Cause",
    "taskName": "Configure Accounts",
    "status": "Done",
    "description": "Either buy emails\nOr have the user upload their emails\nGet emails warming up",
    "assignedTo": "Iheoma Nwanyanwu",
    "order": 2,
    "dueDate": "2025-04-03T15:48:01.000Z"
  },
  {
    "clientName": "Scale Your Cause",
    "taskName": "Choose Market",
    "status": "Done",
    "description": "No Description",
    "assignedTo": "Iheoma Nwanyanwu",
    "order": 3,
    "dueDate": "2025-03-25T15:48:01.000Z"
  }
];

// Endpoint handler - simplified, just returns the mock data
export async function POST(request: Request) {
  console.log("🟢 API Route started: /api/admin/mock-tasks");
  
  try {
    // 1. Check Authentication and Authorization
    console.log("Attempting to get session...");
    const session = await getServerSession(authOptions);
    console.log("Session retrieved:", session ? "Session exists" : "No session");
    
    if (!session || session.user?.role !== 'admin') {
      console.log("Authorization failed: Not an admin or no session");
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // 2. Parse Request Body - just for logging
    try {
      const body = await request.json();
      console.log("Request body:", body);
    } catch (error) {
      // Ignore parsing errors for this mock endpoint
      console.log("No JSON body in request");
    }
    
    // 3. Return hardcoded mock data
    console.log(`Returning ${MOCK_TASKS.length} mock tasks`);
    console.log("First task sample:", MOCK_TASKS[0]);
    
    // No external calls, just return the hardcoded data
    return NextResponse.json(MOCK_TASKS);
  } catch (error) {
    console.error("Error in mock tasks API route:", error);
    return NextResponse.json([], { status: 500 }); // Return empty array on error
  }
} 