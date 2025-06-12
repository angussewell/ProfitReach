import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

/**
 * Super simple auth check for API routes
 * Minimal security - just checks if there's a session
 */
export async function getAuth() {
  try {
    const session = await getServerSession(authOptions);
    
    // No session at all
    if (!session?.user) {
      console.warn("[Auth] No session user found");
      return { 
        session: null,
        error: new NextResponse("Unauthorized", { status: 401 })
      };
    }

    // Session exists - don't worry too much about other checks
    return { session, error: null };
  } catch (error) {
    console.error("[Auth] Error getting session:", error);
    return { 
      session: null,
      error: new NextResponse("Auth error", { status: 500 })
    };
  }
}
