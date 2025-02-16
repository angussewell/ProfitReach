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

    // Find the most recent pending account
    const pendingAccount = await prisma.emailAccount.findFirst({
      where: {
        name: {
          startsWith: 'Pending Account'
        },
        isActive: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!pendingAccount) {
      console.error(`❌ [${requestId}] No pending account found to update`);
      return NextResponse.json({
        status: 'error',
        message: 'No pending account found to update'
      }, { status: 404 });
    }

    // Update the pending account with the real data
    const updatedAccount = await prisma.emailAccount.update({
      where: { id: pendingAccount.id },
      data: {
        email,
        name: name || email,
        unipileAccountId,
        isActive
      }
    });

    console.log(`✅ [${requestId}] Updated pending account with real data:`, {
      id: updatedAccount.id,
      email: updatedAccount.email,
      organizationId: updatedAccount.organizationId,
      previousName: pendingAccount.name,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      status: 'success',
      message: 'Pending account updated with real data',
      data: {
        id: updatedAccount.id,
        email: updatedAccount.email,
        organizationId: updatedAccount.organizationId,
        unipileAccountId: updatedAccount.unipileAccountId,
        previousName: pendingAccount.name
      }
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Error updating pending account:`, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({
      status: 'error',
      message: 'Error updating pending account',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 