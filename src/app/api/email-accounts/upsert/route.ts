import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Define upsert request schema
const UpsertEmailAccountSchema = z.object({
  unipileAccountId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  isActive: z.boolean().default(true)
});

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    // Verify database connection
    try {
      const totalAccounts = await prisma.emailAccount.count();
      console.log(`📊 [${requestId}] Database connection verified. Total accounts:`, totalAccounts);
    } catch (dbError) {
      console.error(`❌ [${requestId}] Database connection error:`, {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        timestamp: new Date().toISOString()
      });
      throw dbError;
    }

    // Add a small delay to ensure account creation is committed
    await wait(1000);

    // Find all recently created accounts
    const recentAccounts = await prisma.emailAccount.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log(`🔍 [${requestId}] Recent accounts:`, {
      count: recentAccounts.length,
      accounts: recentAccounts.map(acc => ({
        id: acc.id,
        email: acc.email,
        name: acc.name,
        isActive: acc.isActive,
        createdAt: acc.createdAt,
        organizationId: acc.organizationId
      })),
      timestamp: new Date().toISOString()
    });

    // Now find inactive accounts
    const inactiveAccounts = await prisma.emailAccount.findMany({
      where: {
        isActive: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`🔍 [${requestId}] Inactive accounts:`, {
      count: inactiveAccounts.length,
      accounts: inactiveAccounts.map(acc => ({
        id: acc.id,
        email: acc.email,
        name: acc.name,
        createdAt: acc.createdAt,
        organizationId: acc.organizationId
      })),
      timestamp: new Date().toISOString()
    });

    // Try to find the most recently created account, regardless of status
    const mostRecentAccount = recentAccounts[0];

    if (!mostRecentAccount) {
      console.error(`❌ [${requestId}] No accounts found in database`);
      return NextResponse.json({
        status: 'error',
        message: 'No accounts found in database',
        debug: {
          totalAccounts: await prisma.emailAccount.count()
        }
      }, { status: 404 });
    }

    // Log the account we'll try to update
    console.log(`✅ [${requestId}] Found most recent account:`, {
      id: mostRecentAccount.id,
      email: mostRecentAccount.email,
      name: mostRecentAccount.name,
      isActive: mostRecentAccount.isActive,
      organizationId: mostRecentAccount.organizationId,
      createdAt: mostRecentAccount.createdAt,
      timestamp: new Date().toISOString()
    });

    // Update the account
    const updatedAccount = await prisma.emailAccount.update({
      where: { id: mostRecentAccount.id },
      data: {
        email,
        name: name || email,
        unipileAccountId,
        isActive
      }
    });

    console.log(`✅ [${requestId}] Updated account with real data:`, {
      id: updatedAccount.id,
      email: updatedAccount.email,
      name: updatedAccount.name,
      organizationId: updatedAccount.organizationId,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      status: 'success',
      message: 'Account updated successfully',
      data: {
        id: updatedAccount.id,
        email: updatedAccount.email,
        organizationId: updatedAccount.organizationId,
        unipileAccountId: updatedAccount.unipileAccountId
      }
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Error updating account:`, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({
      status: 'error',
      message: 'Error updating account',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}