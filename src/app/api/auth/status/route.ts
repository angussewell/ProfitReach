import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getSession();
    
    // Return authentication status details for debugging
    return NextResponse.json({
      authenticated: !!session,
      user: session ? {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        hasOrganization: !!session.user.organizationId,
        organizationId: session.user.organizationId || null,
        organizationName: session.user.organizationName || null,
      } : null,
      timestamp: new Date().toISOString(),
      env: {
        nodeEnv: process.env.NODE_ENV,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      }
    });
  } catch (error) {
    console.error('Auth status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve authentication status',
        authenticated: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
