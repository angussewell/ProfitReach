import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic API route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get the search query from URL parameters
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    // Check if email is provided
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Search for the email account across all organizations
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        email: email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        unipileAccountId: true
      }
    });

    // If no account found, return 404
    if (!emailAccount) {
      return NextResponse.json(
        { 
          error: 'Email account not found',
          message: `No email account found matching: ${email}`
        },
        { status: 404 }
      );
    }

    // Return the found account
    return NextResponse.json(emailAccount);
  } catch (error) {
    console.error('Error searching for email account:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });

    return NextResponse.json(
      { 
        error: 'Failed to search for email account',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 