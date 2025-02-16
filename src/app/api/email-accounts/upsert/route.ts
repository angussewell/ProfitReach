import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Constants for unassigned organization
const UNASSIGNED_ORG_ID = 'cm78a5qs00000ha6e89p5tgm4';  // Fixed ID for unassigned organization
const UNASSIGNED_ORG_NAME = 'Unassigned Accounts';

// Define upsert request schema
const UpsertEmailAccountSchema = z.object({
  unipileAccountId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  isActive: z.boolean().default(true)
});

// Function to ensure unassigned organization exists
async function ensureUnassignedOrganization(): Promise<string> {
  try {
    const existing = await prisma.organization.findUnique({
      where: { id: UNASSIGNED_ORG_ID }
    });

    if (!existing) {
      const created = await prisma.organization.create({
        data: {
          id: UNASSIGNED_ORG_ID,
          name: UNASSIGNED_ORG_NAME,
          webhookUrl: `unassigned-${Date.now()}`,
        }
      });
      return created.id;
    }

    return existing.id;
  } catch (error) {
    console.error('❌ Error ensuring unassigned organization:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🔄 [${requestId}] Email account upsert request:`, {
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  try {
    const body = await req.json();
    console.log(`📦 [${requestId}] Upsert request body:`, {
      body,
      timestamp: new Date().toISOString()
    });

    // Validate request data
    const validationResult = UpsertEmailAccountSchema.safeParse(body);
    if (!validationResult.success) {
      console.error(`❌ [${requestId}] Invalid request format:`, {
        errors: validationResult.error.issues,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({
        status: 'error',
        message: 'Invalid request format',
        errors: validationResult.error.issues
      }, { status: 400 });
    }

    const { unipileAccountId, email, name, isActive } = validationResult.data;

    // Try to find existing account by Unipile ID or email
    const existingAccount = await prisma.emailAccount.findFirst({
      where: {
        OR: [
          { unipileAccountId },
          { email }
        ]
      }
    });

    if (existingAccount) {
      // Update existing account
      const updatedAccount = await prisma.emailAccount.update({
        where: { id: existingAccount.id },
        data: {
          email,
          name: name || email,
          unipileAccountId,
          isActive
        }
      });

      console.log(`✅ [${requestId}] Updated existing email account:`, {
        id: updatedAccount.id,
        email: updatedAccount.email,
        organizationId: updatedAccount.organizationId,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        status: 'success',
        message: 'Email account updated',
        data: {
          id: updatedAccount.id,
          email: updatedAccount.email,
          organizationId: updatedAccount.organizationId,
          unipileAccountId: updatedAccount.unipileAccountId
        }
      });
    }

    // If no existing account, create new one in unassigned organization
    const unassignedOrgId = await ensureUnassignedOrganization();
    
    const newAccount = await prisma.emailAccount.create({
      data: {
        email,
        name: name || email,
        unipileAccountId,
        isActive,
        organizationId: unassignedOrgId
      }
    });

    console.log(`✅ [${requestId}] Created new email account:`, {
      id: newAccount.id,
      email: newAccount.email,
      organizationId: newAccount.organizationId,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      status: 'success',
      message: 'Email account created',
      data: {
        id: newAccount.id,
        email: newAccount.email,
        organizationId: newAccount.organizationId,
        unipileAccountId: newAccount.unipileAccountId
      }
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Error upserting email account:`, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({
      status: 'error',
      message: 'Error upserting email account',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 