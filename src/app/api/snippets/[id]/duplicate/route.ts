import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma'; // Assuming standard path from project structure
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Assuming standard path from project structure
import { v4 as uuidv4 } from 'uuid'; // Use uuid v4 instead of cuid
import { Snippet } from '@prisma/client'; // Import Snippet type for clarity

/**
 * Finds a unique name for a duplicated snippet within a target organization.
 * Starts with the base name, then appends "(copy)", then "(copy 1)", "(copy 2)", etc.
 * @param baseName The original name of the snippet.
 * @param orgId The ID of the target organization.
 * @returns A unique name for the snippet in the target organization.
 */
async function findUniqueName(baseName: string, orgId: string): Promise<string> {
    let finalName = baseName;
    let count = await prisma.snippet.count({
        where: { name: finalName, organizationId: orgId },
    });

    // If the original name is available, use it
    if (count === 0) {
        return finalName;
    }

    // Try appending "(copy)" first
    finalName = `${baseName} (copy)`;
    count = await prisma.snippet.count({
        where: { name: finalName, organizationId: orgId },
    });

    if (count === 0) {
        return finalName;
    }

    // If "(copy)" is taken, start appending numbers "(copy i)"
    let i = 1;
    // Loop indefinitely until an available name is found
    // Added a safety break, although unlikely to be needed with CUIDs/UUIDs for orgs/snippets
    while (count > 0) {
        finalName = `${baseName} (copy ${i})`;
        count = await prisma.snippet.count({
            where: { name: finalName, organizationId: orgId },
        });
        i++;
        if (i > 1000) { // Safety break to prevent infinite loops in unexpected scenarios
             console.error(`Could not find unique name for ${baseName} in org ${orgId} after 1000 attempts.`);
             throw new Error(`Failed to generate a unique name for snippet duplication.`);
        }
    }
    return finalName;
}

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } } // Changed snippetId to id
): Promise<NextResponse> {
    try {
        // 1. Authentication & Basic Input Validation
        const session = await getServerSession(authOptions); // Use getServerSession with authOptions
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const { id } = params; // Changed snippetId to id
        if (!id || typeof id !== 'string') {
            return NextResponse.json({ error: 'Valid ID parameter is required' }, { status: 400 });
        }

        let targetOrganizationId: string;
        try {
            const body = await req.json();
            targetOrganizationId = body.targetOrganizationId;
            if (!targetOrganizationId || typeof targetOrganizationId !== 'string') {
                return NextResponse.json({ error: 'targetOrganizationId (string) is required in the request body' }, { status: 400 });
            }
        } catch (error) {
            return NextResponse.json({ error: 'Invalid or missing JSON request body' }, { status: 400 });
        }

        // 2. Fetch Original Snippet & Authorization Check (Source Org)
        const originalSnippet = await prisma.snippet.findUnique({
            where: { id: id }, // Changed snippetId to id
        });

        if (!originalSnippet) {
            return NextResponse.json({ error: 'Snippet not found' }, { status: 404 });
        }

        // Add check for null organizationId on the original snippet
        if (!originalSnippet.organizationId) {
            console.error(`Snippet ${id} does not have an associated organizationId.`); // Changed snippetId to id
            return NextResponse.json({ error: 'Internal Server Error: Snippet is missing organization association.' }, { status: 500 });
        }

        // Verify user has access to the *original* snippet's organization
        const sourceOrgAccess = await prisma.organization.findFirst({
            where: {
                id: originalSnippet.organizationId, // Now guaranteed non-null
                User: { some: { id: userId } }, // Correct relation name: User
            },
            select: { id: true } // Select minimal data just for existence check
        });

        if (!sourceOrgAccess) {
            console.warn(`User ${userId} attempted to duplicate snippet ${id} from org ${originalSnippet.organizationId} without access.`); // Changed snippetId to id
            return NextResponse.json({ error: 'Forbidden: Access denied to the snippet\'s organization' }, { status: 403 });
        }

        // 3. Authorization Check (Target Org - if different)
        // (Removed: No longer checking user membership in target org for duplication)
        // If same org, sourceOrgAccess check already covers permission.

        // 4. Naming Conflict Resolution
        const finalName = await findUniqueName(originalSnippet.name, targetOrganizationId);

        // 5. Generate New ID
        const newSnippetId = uuidv4(); // Use uuidv4()

        // 6. Database Insertion (CRITICAL: Use $executeRaw as requested)
        // Ensure all non-nullable fields defined in `prisma/schema.prisma` for Snippet
        // that don't have a default value are included here.
        // Assuming standard fields: id, name, content, organizationId, createdAt, updatedAt
        const result = await prisma.$executeRaw`
            INSERT INTO "Snippet" ("id", "name", "content", "organizationId", "createdAt", "updatedAt")
            VALUES (${newSnippetId}, ${finalName}, ${originalSnippet.content}, ${targetOrganizationId}, NOW(), NOW())
        `;

        // $executeRaw returns the number of affected rows. Check if it's 1 for success.
        if (result !== 1) {
             console.error(`Failed to insert duplicated snippet. $executeRaw returned ${result}. Data:`, { newSnippetId, finalName, targetOrganizationId });
             throw new Error('Database insertion failed during snippet duplication.');
        }


        // 7. Fetch the newly created snippet to return in the response
        const newSnippet = await prisma.snippet.findUnique({
            where: { id: newSnippetId },
        });

        if (!newSnippet) {
             // This case indicates a potential issue (e.g., replication delay, transaction rollback?)
             console.error(`Failed to fetch newly created snippet with ID: ${newSnippetId} immediately after insertion.`);
             // Consider if returning a simpler success message might be better if fetch fails
             return NextResponse.json({ error: 'Duplication succeeded but failed to retrieve the new snippet data' }, { status: 500 });
        }

        // 8. Success Response
        return NextResponse.json(newSnippet, { status: 201 });

    } catch (error) {
        console.error('Error duplicating snippet:', error);
        // Provide a generic error message to the client
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
    }
}
