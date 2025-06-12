import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

/**
 * Gets the current session for a server component or API route
 * @returns The session or null if no session exists
 */
export async function getSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error("[Auth] Error getting session:", error);
    return null;
  }
}

/**
 * Validates that a user is authenticated and has an organization ID
 * @returns An object with the session and a potential error response
 */
export async function validateAuth() {
  try {
    const session = await getSession();
    
    // Check if user is authenticated
    if (!session?.user) {
      console.warn("[Auth] No session user found");
      return { 
        session: null,
        error: new NextResponse("Unauthorized", { status: 401 })
      };
    }

    // Check if user has an organization ID
    if (!session.user.organizationId) {
      console.warn("[Auth] User has no organization ID:", session.user.id);
      return { 
        session,
        error: new NextResponse("No organization found", { status: 403 })
      };
    }

    // Authentication successful
    return { session, error: null };
  } catch (error) {
    console.error("[Auth] Error validating authentication:", error);
    return { 
      session: null,
      error: new NextResponse("Internal server error", { status: 500 })
    };
  }
}
