import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface Organization {
  id: string;
  name: string;
  webhookUrl: string;
  outboundWebhookUrl: string | null;
  location_id: string | null;
  billingPlan: string;
  creditBalance: number;
  creditUsage: Array<{
    id: string;
    amount: number;
    description: string | null;
    createdAt: Date;
  }> | null;
  connectedAccounts: Array<{
    id: string;
    accountType: string;
    accountId: string;
  }> | null;
}

// Validation schema for PATCH request
const updateSchema = z.object({
  outboundWebhookUrl: z.string().url().nullable().optional(),
  location_id: z.string().min(1).nullable().optional()
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      console.error('No session or organizationId found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching organization with raw SQL for ID:', session.user.organizationId);

    // Use raw SQL to ensure we get the exact fields we want
    const result = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        "webhookUrl",
        "outboundWebhookUrl",
        location_id,
        "billingPlan",
        "creditBalance"
      FROM "Organization"
      WHERE id = ${session.user.organizationId}
    `;

    console.log('Raw SQL query result:', result);

    // Handle case where result is an array
    const organization = Array.isArray(result) ? result[0] : result;

    if (!organization) {
      console.error('Organization not found for ID:', session.user.organizationId);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Detailed error in GET /api/organizations/current:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    console.log('Received update request with body:', body);
    
    const validatedData = updateSchema.parse(body);
    console.log('Validated data:', validatedData);

    // If location_id is being updated, check for uniqueness
    if (validatedData.location_id !== undefined) {
      const existingOrgs = await prisma.$queryRaw`
        SELECT id FROM "Organization"
        WHERE location_id = ${validatedData.location_id}
        AND id != ${session.user.organizationId}
      `;

      if (Array.isArray(existingOrgs) && existingOrgs.length > 0) {
        return NextResponse.json(
          { error: 'This location ID is already in use by another organization' },
          { status: 409 }
        );
      }
    }

    // Build update query parts
    const updates = [];
    const values = [];
    
    if (validatedData.outboundWebhookUrl !== undefined) {
      updates.push(`"outboundWebhookUrl" = ${validatedData.outboundWebhookUrl === null ? 'NULL' : `'${validatedData.outboundWebhookUrl}'`}`);
    }
    
    if (validatedData.location_id !== undefined) {
      updates.push(`location_id = ${validatedData.location_id === null ? 'NULL' : `'${validatedData.location_id}'`}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    console.log('Executing update with:', { updates });

    // Perform update with raw SQL
    const result = await prisma.$executeRaw`
      UPDATE "Organization"
      SET ${Prisma.sql([updates.join(', ')])}
      WHERE id = ${session.user.organizationId}
    `;

    console.log('Update result:', result);

    // Fetch updated organization
    const updatedOrg = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        "webhookUrl",
        "outboundWebhookUrl",
        location_id,
        "billingPlan",
        "creditBalance"
      FROM "Organization"
      WHERE id = ${session.user.organizationId}
    `;

    const organization = Array.isArray(updatedOrg) ? updatedOrg[0] : updatedOrg;

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Detailed error in PATCH /api/organizations/current:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
} 