import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FilterState } from '@/types/filters';
import { buildCombinedWhereClause, createApiResponse } from '@/lib/filters'; // Ensure buildCombinedWhereClause is imported
import { Prisma } from '@prisma/client'; // Import Prisma types if needed

// Mark route as dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

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

    // --- START: Tag Filter Processing ---

    // 1. Separate tag conditions and non-tag conditions
    const tagConditions = parsedFilterState?.conditions.filter(c => c.field === 'tags') || [];
    const nonTagConditions = parsedFilterState?.conditions.filter(c => c.field !== 'tags') || [];

    // 2. Create FilterState for non-tag filters only
    const nonTagFilterState: FilterState | null = nonTagConditions.length > 0 ? {
      conditions: nonTagConditions,
      logicalOperator: parsedFilterState?.logicalOperator || 'AND'
    } : null;

    // 3. Build base WHERE clause for non-tag filters + search term
    // This now correctly ignores 'tags' field as per the updated buildPrismaWhereFromFilters
    let combinedWhere = buildCombinedWhereClause(
      organizationId,
      nonTagFilterState,
      searchParam
    );
    console.log('[CONTACTS API] Base WHERE clause (non-tags + search):', JSON.stringify(combinedWhere, null, 2));


    // 4. Process tag conditions: Lookup IDs and build tag-specific clauses
    let tagWhereClauses: Prisma.ContactsWhereInput[] = [];
    if (tagConditions.length > 0) {
      const tagNamesToLookup = new Set<string>();
      tagConditions.forEach(cond => {
        // Ensure value is an array and contains strings
        if (Array.isArray(cond.value)) {
          cond.value.forEach(name => typeof name === 'string' && tagNamesToLookup.add(name));
        }
      });

      const tagNameMap = new Map<string, string>();
      if (tagNamesToLookup.size > 0) {
        try {
          console.log(`[CONTACTS API] Looking up tag IDs for names: ${Array.from(tagNamesToLookup).join(', ')}`);
          const foundTags = await prisma.tags.findMany({
            where: {
              organizationId,
              name: { in: Array.from(tagNamesToLookup) }
            },
            select: { id: true, name: true }
          });
          foundTags.forEach(tag => tagNameMap.set(tag.name, tag.id));
          console.log(`[CONTACTS API] Found ${tagNameMap.size} matching tag IDs.`);
        } catch (tagLookupError) {
           console.error('[CONTACTS API] Error looking up tag IDs:', tagLookupError);
           // Decide how to handle: proceed without tag filters, return error?
           // For now, proceed without tag filters if lookup fails.
           tagWhereClauses = []; // Clear any potentially built clauses
        }
      }

      // Build clauses only if lookup didn't error out
      if (tagWhereClauses.length === 0) { // Check if cleared due to error
          tagConditions.forEach(cond => {
            const operator = cond.operator;
            // Ensure value is an array of strings before mapping
            const tagNames = Array.isArray(cond.value) ? cond.value.filter((v): v is string => typeof v === 'string') : [];
            // Map names to IDs, filtering out names not found in the map
            const tagIds = tagNames.map(name => tagNameMap.get(name)).filter((id): id is string => !!id);

            // Skip operators requiring IDs if no valid IDs were found for this condition
            if (tagIds.length === 0 && operator !== 'hasNoTags') {
              console.warn(`[CONTACTS API] No valid tag IDs found for condition, skipping: ${JSON.stringify(cond)}`);
              return; // Skip this specific condition
            }

            let clause: Prisma.ContactsWhereInput | null = null;
            switch (operator) {
              case 'hasAnyTags':
                clause = { ContactTags: { some: { tagId: { in: tagIds } } } };
                break;
              case 'hasAllTags':
                // Only add clause if there are IDs to check for
                if (tagIds.length > 0) {
                   clause = { AND: tagIds.map(id => ({ ContactTags: { some: { tagId: id } } })) };
                }
                break;
              case 'hasNoneOfTheTags':
                 // Only add clause if there are IDs to check against
                 if (tagIds.length > 0) {
                    clause = { ContactTags: { none: { tagId: { in: tagIds } } } };
                 }
                break;
              case 'hasNoTags': // This one doesn't need IDs
                clause = { ContactTags: { none: {} } };
                break;
              default:
                 console.warn(`[CONTACTS API] Unsupported tag operator in route: ${operator}`);
            }
            if (clause) {
                tagWhereClauses.push(clause);
            }
          });
      }
    }
    console.log('[CONTACTS API] Generated tag WHERE clauses:', JSON.stringify(tagWhereClauses, null, 2));


    // 5. Merge tagWhereClauses into combinedWhere respecting the main logicalOperator
    if (tagWhereClauses.length > 0) {
      const logicalOp = parsedFilterState?.logicalOperator || 'AND'; // Default to AND

      if (logicalOp === 'OR') {
        // Ensure OR array exists
        if (!Array.isArray(combinedWhere.OR)) combinedWhere.OR = [];
        // Add the tag conditions to the main OR array
        combinedWhere.OR.push(...tagWhereClauses);
        console.log('[CONTACTS API] Merged tag clauses using OR');

      } else { // AND (default)
        // Ensure AND array exists
        if (!Array.isArray(combinedWhere.AND)) combinedWhere.AND = [];
         // Add the tag conditions to the main AND array
        combinedWhere.AND.push(...tagWhereClauses);
        console.log('[CONTACTS API] Merged tag clauses using AND');
      }
    }

    // --- END: Tag Filter Processing ---

    const finalWhereClause = combinedWhere; // Use the potentially modified combinedWhere

    console.log('[CONTACTS API] Final generated Prisma WHERE clause:', JSON.stringify(finalWhereClause, null, 2));

    // Use the finalWhereClause for counting
    const totalCount = await prisma.contacts.count({
      where: finalWhereClause,
    });

    console.log(`[CONTACTS API] Found ${totalCount} contacts matching criteria for organization ${organizationId}`);

    // Use the finalWhereClause for fetching
    const contacts = await prisma.contacts.findMany({
      where: finalWhereClause, // Apply combined filters and search
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
        propertyCount: true,
        pms: true,
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
