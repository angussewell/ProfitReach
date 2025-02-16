import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Define update request schema
const UpdateEmailAccountSchema = z.object({
  tempAccountId: z.string(),
  unipileAccountId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  isActive: z.boolean().default(true)
});

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🔄 [${requestId}] Email account update request:`, {
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  try {
    const body = await req.json();
    console.log(`📦 [${requestId}] Update request body:`, {
      body,
      timestamp: new Date().toISOString()
    });

    // Validate request data
    const validationResult = UpdateEmailAccountSchema.safeParse(body);
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

    const { tempAccountId, unipileAccountId, email, name, isActive } = validationResult.data;

    // Find the temporary account
    const existingAccount = await prisma.emailAccount.findUnique({
      where: { id: tempAccountId }
    });

    if (!existingAccount) {
      console.error(`❌ [${requestId}] Temporary account not found:`, {
        tempAccountId,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({
        status: 'error',
        message: 'Temporary account not found'
      }, { status: 404 });
    }

    // Update the account with Unipile data
    const updatedAccount = await prisma.emailAccount.update({
      where: { id: tempAccountId },
      data: {
        email,
        name: name || email,
        unipileAccountId,
        isActive
      }
    });

    console.log(`✅ [${requestId}] Updated email account:`, {
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
  } catch (error) {
    console.error(`❌ [${requestId}] Error updating email account:`, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({
      status: 'error',
      message: 'Error updating email account',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 