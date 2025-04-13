import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const currentOrgId = session.user.organizationId;

        const organizations = await prisma.organization.findMany({
            where: {
                ...(currentOrgId ? { id: { not: currentOrgId } } : {})
            },
            select: {
                id: true,
                name: true
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(organizations);

    } catch (error) {
        console.error('Error fetching user organizations:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
    }
}
