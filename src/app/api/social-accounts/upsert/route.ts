import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Define upsert request schema
const UpsertSocialAccountSchema = z.object({
  unipileAccountId: z.string(),
  username: z.string(),
  name: z.string().optional(),
  provider: z.string(),
  isActive: z.boolean().default(true)
});

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🔄 [${requestId}] Social account upsert request:`, {
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
    const validationResult = UpsertSocialAccountSchema.safeParse(body);
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

    const { unipileAccountId, username, name, provider, isActive } = validationResult.data;

    // Find the most recent pending account for this provider
    const pendingAccount = await prisma.socialAccount.findFirst({
      where: {
        name: {
          startsWith: 'Pending Account'
        },
        provider: provider.toUpperCase(),
        isActive: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!pendingAccount) {
      console.error(`❌ [${requestId}] No pending ${provider} account found to update`);
      return NextResponse.json({
        status: 'error',
        message: `No pending ${provider} account found to update`
      }, { status: 404 });
    }

    // Update the pending account with the real data
    const updatedAccount = await prisma.socialAccount.update({
      where: { id: pendingAccount.id },
      data: {
        username,
        name: name || username,
        unipileAccountId,
        isActive
      }
    });

    console.log(`✅ [${requestId}] Updated pending social account with real data:`, {
      id: updatedAccount.id,
      username: updatedAccount.username,
      provider: updatedAccount.provider,
      organizationId: updatedAccount.organizationId,
      previousName: pendingAccount.name,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      status: 'success',
      message: 'Pending social account updated with real data',
      data: {
        id: updatedAccount.id,
        username: updatedAccount.username,
        provider: updatedAccount.provider,
        organizationId: updatedAccount.organizationId,
        unipileAccountId: updatedAccount.unipileAccountId,
        previousName: pendingAccount.name
      }
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Error updating pending social account:`, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({
      status: 'error',
      message: 'Error updating pending social account',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 