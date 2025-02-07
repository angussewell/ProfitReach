import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for email account validation
const emailAccountSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      console.error('Unauthorized: No valid session or organization ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailAccounts = await prisma.emailAccount.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    // Don't send passwords in the response
    const sanitizedAccounts = emailAccounts.map(account => ({
      ...account,
      password: undefined,
    }));

    return NextResponse.json(sanitizedAccounts);
  } catch (error) {
    console.error('Error fetching email accounts:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          { error: 'Database connection error. Please try again.' },
          { status: 503 }
        );
      }
      if (error.message.includes('auth') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          { error: 'Authentication error. Please log in again.' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch email accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = emailAccountSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if email already exists for this organization
    const existingAccount = await prisma.emailAccount.findFirst({
      where: {
        email: data.email,
        organizationId: session.user.organizationId,
      },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Email account already exists' },
        { status: 400 }
      );
    }

    const emailAccount = await prisma.emailAccount.create({
      data: {
        ...data,
        organizationId: session.user.organizationId,
      },
    });

    // Don't send password in the response
    const { password, ...sanitizedAccount } = emailAccount;

    return NextResponse.json(sanitizedAccount);
  } catch (error) {
    console.error('Error creating email account:', error);
    return NextResponse.json(
      { error: 'Failed to create email account' },
      { status: 500 }
    );
  }
} 