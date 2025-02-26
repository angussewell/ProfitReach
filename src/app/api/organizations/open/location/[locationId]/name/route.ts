import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { locationId: string } }
) {
  try {
    const { locationId } = params;

    const organizations = await prisma.$queryRaw`
      SELECT name 
      FROM "Organization" 
      WHERE location_id = ${locationId}
      LIMIT 1
    `;

    const organization = Array.isArray(organizations) ? organizations[0] : null;

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ name: organization.name });
  } catch (error) {
    console.error('Error fetching organization name:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization name' },
      { status: 500 }
    );
  }
} 