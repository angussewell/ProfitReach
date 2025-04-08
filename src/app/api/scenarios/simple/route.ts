import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createApiResponse } from '@/lib/filters';

// Mark route as dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

/**
 * API route to fetch simplified scenario data for use in dropdowns/selectors
 * Only returns id and name to reduce payload size
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      const { response, status } = createApiResponse(false, undefined, 'Unauthorized', 401);
      return NextResponse.json(response, { status });
    }
    
    const organizationId = session.user.organizationId;

    // Fetch scenarios that belong to this organization
    const scenarios = await prisma.scenario.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc', // Sort alphabetically by name
      },
    });

    // Return success response with the simplified scenario data
    const { response } = createApiResponse(true, scenarios);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching simplified scenario data:', error);
    
    // Return error response
    const { response, status } = createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
    
    return NextResponse.json(response, { status });
  }
}
