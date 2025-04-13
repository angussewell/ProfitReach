import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * Finds a unique name for a duplicated scenario within a target organization.
 * Appends (copy), (copy 1), etc. as needed.
 */
async function findUniqueName(baseName: string, orgId: string): Promise<string> {
    let finalName = baseName;
    let count = await prisma.scenario.count({
        where: { name: finalName, organizationId: orgId },
    });

    if (count === 0) {
        return finalName;
    }

    finalName = `${baseName} (copy)`;
    count = await prisma.scenario.count({
        where: { name: finalName, organizationId: orgId },
    });

    if (count === 0) {
        return finalName;
    }

    let i = 1;
    while (count > 0) {
        finalName = `${baseName} (copy ${i})`;
        count = await prisma.scenario.count({
            where: { name: finalName, organizationId: orgId },
        });
        i++;
        if (i > 1000) {
            console.error(`Could not find unique name for ${baseName} in org ${orgId} after 1000 attempts.`);
            throw new Error(`Failed to generate a unique name for scenario duplication.`);
        }
    }
    return finalName;
}

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    try {
        // 1. Authentication & Basic Input Validation
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const { id } = params;
        if (!id || typeof id !== 'string') {
            return NextResponse.json({ error: 'Valid Scenario ID parameter is required' }, { status: 400 });
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

        // 2. Fetch Original Scenario & Authorization Check (Source Org)
        const original = await prisma.scenario.findUnique({
            where: { id },
        });

        if (!original) {
            return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
        }

        if (!original.organizationId) {
            console.error(`Scenario ${id} does not have an associated organizationId.`);
            return NextResponse.json({ error: 'Internal Server Error: Scenario is missing organization association.' }, { status: 500 });
        }

        // Verify user has access to the *original* scenario's organization
        const sourceOrgAccess = await prisma.organization.findFirst({
            where: {
                id: original.organizationId,
                User: { some: { id: userId } },
            },
            select: { id: true }
        });

        if (!sourceOrgAccess) {
            console.warn(`User ${userId} attempted to duplicate scenario ${id} from org ${original.organizationId} without access.`);
            return NextResponse.json({ error: 'Forbidden: Access denied to the scenario\'s organization' }, { status: 403 });
        }

        // 3. No target org membership check (per simplification)

        // 4. Naming Conflict Resolution
        const finalName = await findUniqueName(original.name, targetOrganizationId);

        // 5. Generate New ID
        const newScenarioId = uuidv4();

        // 6. Database Insertion (CRITICAL: Use $executeRaw as requested)
        // Shallow copy for signatureId, attachmentId, snippetId
        // All relevant columns included, filters is JSONB
        const result = await prisma.$executeRaw`
            INSERT INTO "Scenario" (
                "id", "name", "organizationId", "description", "status",
                "customizationPrompt", "emailExamplesPrompt", "subjectLine", "touchpointType",
                "filters", "testEmail", "testMode", "isHighPerforming", "isFollowUp",
                "signatureId", "attachmentId", "snippetId", "createdAt", "updatedAt"
            )
            VALUES (
                ${newScenarioId}, ${finalName}, ${targetOrganizationId}, ${original.description}, ${original.status},
                ${original.customizationPrompt}, ${original.emailExamplesPrompt}, ${original.subjectLine}, ${original.touchpointType},
                ${original.filters}, ${original.testEmail}, ${original.testMode}, ${original.isHighPerforming}, ${original.isFollowUp},
                ${original.signatureId}, ${original.attachmentId}, ${original.snippetId}, NOW(), NOW()
            )
        `;

        if (result !== 1) {
            console.error(`Failed to insert duplicated scenario. $executeRaw returned ${result}. Data:`, { newScenarioId, finalName, targetOrganizationId });
            throw new Error('Database insertion failed during scenario duplication.');
        }

        // 7. Fetch the newly created scenario to return in the response
        const newScenario = await prisma.scenario.findUnique({
            where: { id: newScenarioId },
        });

        if (!newScenario) {
            console.error(`Failed to fetch newly created scenario with ID: ${newScenarioId} immediately after insertion.`);
            return NextResponse.json({ error: 'Duplication succeeded but failed to retrieve the new scenario data' }, { status: 500 });
        }

        // 8. Success Response
        return NextResponse.json(newScenario, { status: 201 });

    } catch (error) {
        console.error('Error duplicating scenario:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
    }
}
