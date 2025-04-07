import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FilterState } from '@/types/filters';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const userId = session.user.id;

    // Log user info for debugging
    console.log('POST /api/saved-filters: User info:', { 
      organizationId, 
      userId, 
      hasUserId: !!userId 
    });

    // Add check for valid userId
    if (!userId) {
      console.warn('POST /api/saved-filters: No userId found in session, using organizationId as userId');
      // Optional: Use organizationId as fallback or handle differently
    }

    const body = await request.json();
    const { name, filters } = body;

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Filter name is required.' }, { status: 400 });
    }
    if (!filters || typeof filters !== 'object' || !Array.isArray(filters.conditions)) {
      return NextResponse.json({ error: 'Invalid filter data format.' }, { status: 400 });
    }
    if (!filters.logicalOperator || (filters.logicalOperator !== 'AND' && filters.logicalOperator !== 'OR')) {
      return NextResponse.json({ error: 'Invalid logical operator in filter data.' }, { status: 400 });
    }

    const filtersJson = JSON.stringify(filters);

    try {
      // Modified to make filters organization-wide (no userId dependency)
      const result = await prisma.$executeRaw`
        INSERT INTO "SavedFilters" ("organizationId", "name", "filters")
        VALUES (${organizationId}, ${name}, ${filtersJson}::jsonb)
      `;

      // If insert succeeded (result === 1), just return success.
      // The client will trigger a refresh via the GET endpoint.
      if (result === 1) {
        return NextResponse.json({ success: true }, { status: 201 });
      } else {
        // This case might indicate an issue, though $executeRaw returning 0 might not always be an error.
        console.error(`Failed to save filter. $executeRaw returned ${result}`);
        return NextResponse.json({ error: 'Failed to save filter. No rows affected.' }, { status: 500 });
      }
    } catch (error: any) {
      // Handle potential unique constraint violation
      if (error.code === 'P2002' || (error.nativeError && error.nativeError.code === '23505')) {
        return NextResponse.json({ error: `A saved filter with the name "${name}" already exists.` }, { status: 409 });
      }

      console.error('Error saving filter:', error);
      return NextResponse.json({ error: 'Failed to save filter due to a server error.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing POST /api/saved-filters:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const userId = session.user.id; // Potentially undefined

    // Log user info for debugging
    console.log('GET /api/saved-filters: User info:', { 
      organizationId, 
      userId, 
      hasUserId: !!userId 
    });

    try {
      // Modified to retrieve all organization filters (no userId dependency)
      const savedFilters: any[] = await prisma.$queryRaw`
        SELECT
          id::text,
          name,
          filters,
          "createdAt",
          "updatedAt"
        FROM "SavedFilters"
        WHERE "organizationId" = ${organizationId}
        ORDER BY name ASC
      `;
      
      console.log('Retrieved organization-wide filters:', savedFilters.length);

      return NextResponse.json({
        success: true,
        data: savedFilters
      }, { status: 200 });

    } catch (dbError) {
      console.error('Database error when fetching saved filters:', dbError);
      return NextResponse.json({
        error: 'Database error while fetching saved filters',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching saved filters:', error);
    return NextResponse.json({
      error: 'Failed to fetch saved filters.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
