import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { Prompt } from '@prisma/client';

/**
 * Finds a unique name for a duplicated prompt within a target organization.
 * Starts with the base name, then appends "(copy)", then "(copy 1)", "(copy 2)", etc.
 * @param baseName The original name of the prompt.
 * @param orgId The ID of the target organization.
 * @returns A unique name for the prompt in the target organization.
 */
async function findUniqueName(baseName: string, orgId: string): Promise<string> {
    let finalName = baseName;
    let count = await prisma.prompt.count({
        where: { name: finalName, organizationId: orgId },
    });

    if (count === 0) {
        return finalName;
    }

    finalName = `${baseName} (copy)`;
    count = await prisma.prompt.count({
        where: { name: finalName, organizationId: orgId },
    });

    if (count === 0) {
        return finalName;
    }

    let i = 1;
    while (count > 0) {
        finalName = `${baseName} (copy ${i})`;
        count = await prisma.prompt.count({
            where: { name: finalName, organizationId: orgId },
        });
        i++;
        if (i > 1000) {
            console.error(`Could not find unique name for ${baseName} in org ${orgId} after 1000 attempts.`);
            throw new Error(`Failed to generate a unique name for prompt duplication.`);
        }
    }
    return finalName;
}

export async function POST(
    req: NextRequest,
    { params }: { params: { promptId: string } }
): Promise<NextResponse> {
    try {
        // 1. Authentication & Basic Input Validation
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const { promptId } = params;
        if (!promptId || typeof promptId !== 'string') {
            return NextResponse.json({ error: 'Valid Prompt ID parameter is required' }, { status: 400 });
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

        // 2. Fetch Original Prompt & Authorization Check (Source Org)
        const originalPrompt = await prisma.prompt.findUnique({
            where: { id: promptId },
        });

        if (!originalPrompt) {
            return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
        }

        if (!originalPrompt.organizationId) {
            console.error(`Prompt ${promptId} does not have an associated organizationId.`);
            return NextResponse.json({ error: 'Internal Server Error: Prompt is missing organization association.' }, { status: 500 });
        }

        // Verify user has access to the *original* prompt's organization
        const sourceOrgAccess = await prisma.organization.findFirst({
            where: {
                id: originalPrompt.organizationId,
                User: { some: { id: userId } },
            },
            select: { id: true }
        });

        if (!sourceOrgAccess) {
            console.warn(`User ${userId} attempted to duplicate prompt ${promptId} from org ${originalPrompt.organizationId} without access.`);
            return NextResponse.json({ error: 'Forbidden: Access denied to the prompt\'s organization' }, { status: 403 });
        }

        // 3. No target org membership check (per simplification)

        // 4. Naming Conflict Resolution
        const finalName = await findUniqueName(originalPrompt.name, targetOrganizationId);

        // 5. Generate New ID
        const newPromptId = uuidv4();

        // 6. Database Insertion (CRITICAL: Use $executeRaw as requested)
        const result = await prisma.$executeRaw`
            INSERT INTO "Prompt" ("id", "name", "content", "organizationId", "createdAt", "updatedAt")
            VALUES (${newPromptId}, ${finalName}, ${originalPrompt.content}, ${targetOrganizationId}, NOW(), NOW())
        `;

        if (result !== 1) {
            console.error(`Failed to insert duplicated prompt. $executeRaw returned ${result}. Data:`, { newPromptId, finalName, targetOrganizationId });
            throw new Error('Database insertion failed during prompt duplication.');
        }

        // 7. Fetch the newly created prompt to return in the response
        const newPrompt = await prisma.prompt.findUnique({
            where: { id: newPromptId },
        });

        if (!newPrompt) {
            console.error(`Failed to fetch newly created prompt with ID: ${newPromptId} immediately after insertion.`);
            return NextResponse.json({ error: 'Duplication succeeded but failed to retrieve the new prompt data' }, { status: 500 });
        }

        // 8. Success Response
        return NextResponse.json(newPrompt, { status: 201 });

    } catch (error) {
        console.error('Error duplicating prompt:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
    }
}
