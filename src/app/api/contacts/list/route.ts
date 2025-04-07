import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FilterState } from '@/types/filters';
import { buildCombinedWhereClause, createApiResponse } from '@/lib/filters'; // Ensure buildCombinedWhereClause is imported
import { Prisma } from '@prisma/client'; // Import Prisma types if needed

// Constants
const MAX_ITEMS_PER_PAGE = 500; // Safety limit for pagination

export async function GET(request: Request) {
  try {
    console.log('[CONTACTS API] Fetching contacts with filtering and search');

    // Extract search params
    const url = new URL(request.url);
    const pageParam = url.searchParams.get('page');
    const pageSizeParam = url.searchParams.get('pageSize');
    const filterParam = url.searchParams.get('filters'); // Stringified JSON FilterState
    const searchParam = url.searchParams.get('search'); // Search term string

    // Parse pagination params
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const pageSize = pageSizeParam ? Math.min(parseInt(pageSizeParam, 10), MAX_ITEMS_PER_PAGE) : MAX_ITEMS_PER_PAGE;
    const skip = (page - 1) * pageSize;

    // Get the organization ID from the session
    const session = await getServerSession(authOptions);
    const organizationId = session?.user?.organizationId;

    if (!organizationId) {
      console.error('[CONTACTS API] Error: Organization ID not found in session. Returning empty list.');
      const { response } = createApiResponse(true, { data: [], totalCount: 0, page, pageSize, totalPages: 0 });
      return NextResponse.json(response);
    }

    console.log(`[CONTACTS API] Using organization ID: ${organizationId}, Page: ${page}, PageSize: ${pageSize}`);
    console.log(`[CONTACTS API] Received filterParam: ${filterParam}`);
    console.log(`[CONTACTS API] Received searchParam: ${searchParam}`);

    // Parse filters if provided
    let parsedFilterState: FilterState | null = null;
    if (filterParam) {
      try {
        parsedFilterState = JSON.parse(filterParam) as FilterState;
        console.log('[CONTACTS API] Parsed FilterState:', JSON.stringify(parsedFilterState, null, 2));
      } catch (parseError) {
        console.error('[CONTACTS API] Error parsing filters JSON:', parseError);
        // Decide how to handle: ignore filters, return error? For now, ignore.
        parsedFilterState = null;
      }
    }

    // *** FIX: Build the combined WHERE clause using the utility function ***
    const whereClause: Prisma.ContactsWhereInput = buildCombinedWhereClause(
      organizationId,
      parsedFilterState,
      searchParam
    );

    console.log('[CONTACTS API] Generated Prisma WHERE clause:', JSON.stringify(whereClause, null, 2));

    // *** FIX: Use the combined whereClause for counting ***
    const totalCount = await prisma.contacts.count({
      where: whereClause,
    });

    console.log(`[CONTACTS API] Found ${totalCount} contacts matching criteria for organization ${organizationId}`);

    // *** FIX: Use the combined whereClause for fetching ***
    const contacts = await prisma.contacts.findMany({
      where: whereClause, // Apply combined filters and search
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        photoUrl: true,
        title: true,
        currentCompanyName: true,
        additionalData: true, // Keep for status extraction
        leadStatus: true,
        city: true,
        state: true,
        country: true,
        // Include fields needed for filtering/display if not already present
        createdAt: true,
        updatedAt: true,
        lastActivityAt: true,
        ContactTags: { // Correct relation name
          select: {
            Tags: { // Correct field name pointing to Tags model
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc', // Or make this dynamic based on request?
      },
      skip,
      take: pageSize,
    });

    console.log(`[API /contacts/list] Retrieved contacts: ${contacts.length}`);

    // Process the contacts (e.g., extract status, format tags)
    const processedContacts = contacts.map(contact => {
      let status: string | undefined = undefined;
      if (contact.additionalData && typeof contact.additionalData === 'object') {
        // @ts-ignore - additionalData is JSONB
        status = contact.additionalData.status;
      }
      // Format tags if needed, using correct relation name and field name, letting TS infer type
      const tags = contact.ContactTags?.map(ct => ct.Tags) // Access the selected Tags object
                                       .filter(tag => tag != null) // Filter out potential nulls if relation is optional (though likely not here)
                                       || [];

      // Create a new object excluding additionalData and the original ContactTags relation
      const { additionalData, ContactTags, ...restOfContact } = contact;

      return {
        ...restOfContact, // Spread the rest of the contact properties
        tags, // Include formatted tags
        status, // Include extracted status
      };
    });

    // Return standardized success response
    const responseData = {
      data: processedContacts,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
    console.log(`[API /contacts/list] Response summary: totalCount=${totalCount}, processedContacts=${processedContacts.length}`);

    const { response } = createApiResponse(true, responseData);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[API /contacts/list ERROR]', error);
    const { response, status } = createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Unknown error fetching contacts',
      500
    );
    console.error('[API /contacts/list ERROR RESPONSE]', JSON.stringify(response));
    return NextResponse.json(response, { status });
  }
}
