import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FilterState } from '@/types/filters';

// DELETE /api/saved-filters/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const filterId = params.id;

    // Validate filter exists and belongs to this organization
    const filter = await prisma.$queryRaw`
      SELECT id::text FROM "SavedFilters" 
      WHERE id::text = ${filterId} AND "organizationId" = ${organizationId}
    `;

    // @ts-ignore - result will be an array
    if (!filter || filter.length === 0) {
      return NextResponse.json({ 
        error: 'Filter not found or does not belong to this organization' 
      }, { status: 404 });
    }

    // Delete the filter
    await prisma.$executeRaw`
      DELETE FROM "SavedFilters" 
      WHERE id::text = ${filterId} AND "organizationId" = ${organizationId}
    `;

    return NextResponse.json({ 
      success: true,
      message: 'Filter deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting saved filter:', error);
    return NextResponse.json({ 
      error: 'Failed to delete filter',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/saved-filters/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const filterId = params.id;

    // Validate filter exists and belongs to this organization
    const filter = await prisma.$queryRaw`
      SELECT id::text FROM "SavedFilters" 
      WHERE id::text = ${filterId} AND "organizationId" = ${organizationId}
    `;

    // @ts-ignore - result will be an array
    if (!filter || filter.length === 0) {
      return NextResponse.json({ 
        error: 'Filter not found or does not belong to this organization' 
      }, { status: 404 });
    }

    // Parse request body
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

    // Update the filter
    await prisma.$executeRaw`
      UPDATE "SavedFilters" 
      SET name = ${name}, filters = ${filtersJson}::jsonb, "updatedAt" = NOW()
      WHERE id::text = ${filterId} AND "organizationId" = ${organizationId}
    `;

    return NextResponse.json({ 
      success: true,
      message: 'Filter updated successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating saved filter:', error);
    return NextResponse.json({ 
      error: 'Failed to update filter',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
