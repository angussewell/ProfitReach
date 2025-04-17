import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client'; // Import Prisma namespace for types

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
        // Safety break to prevent infinite loops in edge cases
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
        // Access organizationId from session.user as defined in next-auth.d.ts
        if (!session?.user?.id || !session.user.organizationId) { // Ensure session.user.organizationId exists
            return NextResponse.json({ error: 'Unauthorized or session missing organization context' }, { status: 401 });
        }
        const userId = session.user.id; // Keep userId for potential logging, though not used for auth checks here
        const sessionOrgId = session.user.organizationId; // Correct path to orgId

        const { id: scenarioIdToDuplicate } = params;
        if (!scenarioIdToDuplicate || typeof scenarioIdToDuplicate !== 'string') {
            return NextResponse.json({ error: 'Valid Scenario ID parameter is required' }, { status: 400 });
        }

        // 2. Parse Request Body (Optional newName and targetOrgId)
        let newName: string | undefined;
        let targetOrgIdFromBody: string | undefined;
        try {
            // Allow empty body or body without specific keys
            const textBody = await req.text();
            const body = textBody ? JSON.parse(textBody) : {};
            newName = body.newName;
            targetOrgIdFromBody = body.targetOrgId;

            if (newName !== undefined && typeof newName !== 'string') {
                 return NextResponse.json({ error: 'If provided, newName must be a string' }, { status: 400 });
            }
             if (targetOrgIdFromBody !== undefined && typeof targetOrgIdFromBody !== 'string') {
                 return NextResponse.json({ error: 'If provided, targetOrgId must be a string' }, { status: 400 });
            }

        } catch (error) {
            return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
        }

        // 3. Fetch Original Scenario data needed for copy
        const originalScenario = await prisma.scenario.findUnique({
            where: { id: scenarioIdToDuplicate },
            select: {
                name: true,
                description: true,
                status: true,
                customizationPrompt: true,
                emailExamplesPrompt: true,
                subjectLine: true,
                touchpointType: true,
                testEmail: true,
                testMode: true,
                isHighPerforming: true,
                isFollowUp: true,
                signatureId: true,
                attachmentId: true,
                snippetId: true,
                // filters is intentionally omitted
            }
        });

        if (!originalScenario) {
            return NextResponse.json({ error: 'Scenario to duplicate not found' }, { status: 404 });
        }

        // 4. Determine Target Organization ID
        const targetOrganizationId = targetOrgIdFromBody ?? sessionOrgId;

        // --- SECURITY CHECK REMOVED as per explicit requirement ---

        // 5. Determine Final Name for the New Scenario
        const baseName = newName ?? originalScenario.name;
        const finalName = await findUniqueName(baseName, targetOrganizationId);

        // 6. Generate New ID
        const newScenarioId = uuidv4();

        // 7. Database Insertion using prisma.scenario.create() [Simplification Override]
        const dataForNewScenario = {
            id: newScenarioId,
            name: finalName,
            organizationId: targetOrganizationId,
            description: originalScenario.description ?? null,
            status: originalScenario.status, // Assuming status is non-nullable or has a suitable default copied
            customizationPrompt: originalScenario.customizationPrompt ?? null,
            emailExamplesPrompt: originalScenario.emailExamplesPrompt ?? null,
            subjectLine: originalScenario.subjectLine ?? null,
            touchpointType: originalScenario.touchpointType ?? null,
            filters: Prisma.JsonNull, // Explicitly set filters to NULL using Prisma.JsonNull
            testEmail: originalScenario.testEmail ?? null,
            testMode: originalScenario.testMode ?? false,
            isHighPerforming: originalScenario.isHighPerforming ?? false,
            isFollowUp: originalScenario.isFollowUp ?? false,
                signatureId: originalScenario.signatureId ?? null,
                attachmentId: originalScenario.attachmentId ?? null,
                snippetId: originalScenario.snippetId ?? null,
                createdAt: new Date(), // Explicitly set createdAt
                updatedAt: new Date(), // Explicitly set updatedAt
            };

            const newScenario = await prisma.scenario.create({
            data: dataForNewScenario,
        });

        // 8. Fetch is no longer needed as create() returns the object

        // 9. Success Response
        return NextResponse.json(newScenario, { status: 201 });

    } catch (error) {
        console.error('Error duplicating scenario (using ORM create):', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return NextResponse.json({ error: 'Internal Server Error', details: process.env.NODE_ENV === 'development' ? message : undefined }, { status: 500 });
    } finally {
        // Optional: Disconnect Prisma client if not using global instance management
        // await prisma.$disconnect();
    }
}
