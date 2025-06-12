import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * Fetches organizations accessible to the current user.
 * - Admins get all organizations.
 * - Non-admins get only their current organization.
 */
export async function GET(req: Request): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let organizations: { id: string; name: string }[] = [];

        if (session.user.role === 'admin') {
            // Admins can access all organizations
            organizations = await prisma.organization.findMany({
                select: {
                    id: true,
                    name: true,
                },
                orderBy: {
                    name: 'asc',
                },
            });
        } else {
            // Non-admins can only access their own organization
            if (session.user.organizationId) {
                const org = await prisma.organization.findUnique({
                    where: { id: session.user.organizationId },
                    select: {
                        id: true,
                        name: true,
                    },
                });
                if (org) {
                    organizations = [org]; // Return as an array
                } else {
                    console.warn(`User ${session.user.id} has organizationId ${session.user.organizationId} but organization not found.`);
                    // Return empty array if their assigned org doesn't exist for some reason
                }
            } else {
                 console.warn(`Non-admin user ${session.user.id} does not have an organizationId.`);
                 // Return empty array if user has no organization assigned
            }
        }

        return NextResponse.json(organizations);

    } catch (error) {
        console.error('Error fetching accessible organizations:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
    }
}
