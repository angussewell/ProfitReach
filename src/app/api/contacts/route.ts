import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { FilterState } from '@/types/filters';
import { buildPrismaWhereFromFilters, buildSqlWhereFromFilters } from '@/lib/filter-utils';
import { Prisma } from '@prisma/client';

// Constants
const PLACEHOLDER_ORG_ID = 'org_test_alpha'; // Fallback for testing

// Type for the required fields in the request body
type CreateContactRequest = {
  firstName?: string;
  lastName?: string;
  email: string;
  leadStatus?: string;
  additionalData?: {
    status?: string;
    [key: string]: any;
  };
};

export async function GET(request: NextRequest) {
  try {
    // Get the organization ID from the session
    const session = await getServerSession(authOptions);
    const organizationId = session?.user?.organizationId || PLACEHOLDER_ORG_ID;
    
    // Parse filter state from search params
    const searchParams = request.nextUrl.searchParams;
    const filtersParam = searchParams.get('filters');
    
    let filterState: FilterState | null = null;
    
    if (filtersParam) {
      try {
        filterState = JSON.parse(decodeURIComponent(filtersParam));
        console.log('API applied filters:', filterState);
      } catch (e) {
        console.error('Error parsing filters in API:', e);
      }
    }
    
    // Get contacts with filtering
    let contacts;
    
    if (filterState) {
      // Check if filtering involves tags
      const hasTagFilters = filterState.conditions.some(c => c.field === 'tags');
      
      if (hasTagFilters) {
        // For tag filtering, we need to use Prisma's query builder for proper relation handling
        const where = buildPrismaWhereFromFilters(filterState, organizationId);
        
        // Use the SQL approach for all filters for type safety and consistency
        const { sql: tagFilterSql } = buildSqlWhereFromFilters(filterState, organizationId);
        
        // Use $queryRaw for all cases
        contacts = await prisma.$queryRaw<any[]>`
          SELECT 
            c.id, 
            c."firstName", 
            c."lastName", 
            c.email, 
            c."photoUrl", 
            c.title, 
            c."currentCompanyName", 
            c."additionalData",
            c."leadStatus",
            c.city,
            c.state,
            c.country,
            c."createdAt",
            c."updatedAt",
            c."lastActivityAt",
            COALESCE(
              (
                SELECT array_agg(t.name)
                FROM "ContactTags" ct
                JOIN "Tags" t ON ct."tagId" = t.id
                WHERE ct."contactId" = c.id
              ),
              '{}'::text[]
            ) AS tags
          FROM "Contacts" c
          ${Prisma.raw(tagFilterSql)}
          ORDER BY c."updatedAt" DESC
        `;
      } else {
        // Use raw SQL for better performance on non-relation filters
        const { sql, params } = buildSqlWhereFromFilters(filterState, organizationId);
        
        // Use $queryRaw for more control over the query
        contacts = await prisma.$queryRaw<any[]>`
          SELECT 
            c.id, 
            c."firstName", 
            c."lastName", 
            c.email, 
            c."photoUrl", 
            c.title, 
            c."currentCompanyName", 
            c."additionalData",
            c."leadStatus",
            c.city,
            c.state,
            c.country,
            c."createdAt",
            c."updatedAt",
            c."lastActivityAt",
            COALESCE(
              (
                SELECT array_agg(t.name)
                FROM "ContactTags" ct
                JOIN "Tags" t ON ct."tagId" = t.id
                WHERE ct."contactId" = c.id
              ),
              '{}'::text[]
            ) AS tags
          FROM "Contacts" c
          ${Prisma.raw(sql)}
          ORDER BY c."updatedAt" DESC
        `;
      }
    } else {
      // No filters, use standard Prisma query
      // Cast the result to any to avoid TypeScript errors with the select fields
      contacts = await prisma.contacts.findMany({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' }
      }) as any[];
    }
    
    // Process the contacts to extract status from additionalData
    const processedContacts = contacts.map((contact: any) => {
      let status: string | undefined = undefined;
      
      if (contact.additionalData && typeof contact.additionalData === 'object') {
        const additionalData = contact.additionalData as any;
        status = additionalData.status;
      }
      
      return {
        ...contact,
        status
      };
    });
    
    return NextResponse.json(processedContacts);
  } catch (error) {
    console.error('Error in contacts API:', error);
    return NextResponse.json(
      { message: 'Error fetching contacts', error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    
    // Basic validation
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { firstName, lastName, email, leadStatus, additionalData } = body as CreateContactRequest;
    
    // Email is required
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Get the organization ID from the session
    const session = await getServerSession(authOptions);
    const organizationId = session?.user?.organizationId || PLACEHOLDER_ORG_ID;
    
    // Log the organization ID for debugging
    console.log('Using organization ID for contact creation:', organizationId);
    
    // Prepare additionalData as JSONB
    const jsonbData = additionalData ? JSON.stringify(additionalData) : '{}';
    
    // Generate a UUID for the contact ID (using UUID v4 pattern)
    // We'll use Postgres gen_random_uuid() function in the query
    
    // Current timestamp for created/updated at
    const now = new Date().toISOString();
    
    try {
      // Use $executeRaw for direct SQL execution as specified
      await prisma.$executeRaw`
        INSERT INTO "Contacts" (
          id, 
          "firstName", 
          "lastName", 
          email, 
          "organizationId", 
          "leadStatus",
          "additionalData", 
          "createdAt", 
          "updatedAt"
        )
        VALUES (
          gen_random_uuid(), 
          ${firstName || null}, 
          ${lastName || null}, 
          ${email}, 
          ${organizationId}, 
          ${leadStatus},
          ${jsonbData}::jsonb, 
          NOW(), 
          NOW()
        )
      `;
      
      return NextResponse.json(
        { message: 'Contact created successfully' },
        { status: 201 }
      );
    } catch (dbError) {
      console.error('Database error creating contact:', dbError);
      
      // Check for duplicate email error
      if (dbError instanceof Error && dbError.message.includes('duplicate key')) {
        return NextResponse.json(
          { message: 'A contact with this email already exists' },
          { status: 409 }
        );
      }
      
      // Other database errors
      return NextResponse.json(
        { message: 'Database error while creating contact' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in contact creation API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
