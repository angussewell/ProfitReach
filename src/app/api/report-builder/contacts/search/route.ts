import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { ContactOption } from '@/types/report-builder';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Ensure limit is reasonable
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    let contacts: ContactOption[];

    if (query.trim() === '') {
      // If no search query, return recent contacts
      contacts = await prisma.$queryRaw<ContactOption[]>`
        SELECT 
          id,
          "firstName",
          "lastName",
          email,
          "currentCompanyName",
          "fullName"
        FROM "Contacts"
        WHERE "organizationId" = ${session.user.organizationId}
        ORDER BY "updatedAt" DESC
        LIMIT ${safeLimit}
      `;
    } else {
      // Search across multiple fields
      const searchTerm = `%${query.toLowerCase()}%`;
      
      contacts = await prisma.$queryRaw<ContactOption[]>`
        SELECT 
          id,
          "firstName",
          "lastName",
          email,
          "currentCompanyName",
          "fullName"
        FROM "Contacts"
        WHERE "organizationId" = ${session.user.organizationId}
        AND (
          LOWER(COALESCE("firstName", '')) LIKE ${searchTerm}
          OR LOWER(COALESCE("lastName", '')) LIKE ${searchTerm}
          OR LOWER(COALESCE("fullName", '')) LIKE ${searchTerm}
          OR LOWER(COALESCE(email, '')) LIKE ${searchTerm}
          OR LOWER(COALESCE("currentCompanyName", '')) LIKE ${searchTerm}
        )
        ORDER BY 
          CASE 
            WHEN LOWER(COALESCE("fullName", '')) LIKE ${`${query.toLowerCase()}%`} THEN 1
            WHEN LOWER(COALESCE(email, '')) LIKE ${`${query.toLowerCase()}%`} THEN 2
            WHEN LOWER(COALESCE("currentCompanyName", '')) LIKE ${`${query.toLowerCase()}%`} THEN 3
            ELSE 4
          END,
          "updatedAt" DESC
        LIMIT ${safeLimit}
      `;
    }

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error searching contacts for report builder:', error);
    return NextResponse.json(
      { error: 'Failed to search contacts' },
      { status: 500 }
    );
  }
}