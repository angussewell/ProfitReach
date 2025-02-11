import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Define webhook data schema
const UnipileAccountWebhook = z.object({
  status: z.enum(['CREATION_SUCCESS', 'RECONNECTED']),
  account_id: z.string(),
  name: z.string()
});

type UnipileAccountData = z.infer<typeof UnipileAccountWebhook>;

export async function POST(request: Request) {
  try {
    console.log('Received Unipile account webhook request', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries())
    });
    
    // Parse and validate webhook data
    let data: UnipileAccountData;
    const rawBody = await request.text();
    
    console.log('Raw webhook body:', rawBody);
    
    try {
      const parsedData = JSON.parse(rawBody);
      data = UnipileAccountWebhook.parse(parsedData);
      console.log('Parsed webhook data:', data);

    } catch (parseError) {
      console.error('Failed to parse webhook data:', {
        error: parseError,
        errorMessage: parseError instanceof Error ? parseError.message : String(parseError),
        rawBody: rawBody.slice(0, 1000) // Log first 1000 chars only
      });
      return NextResponse.json(
        { 
          error: 'Invalid JSON data', 
          details: parseError instanceof Error ? parseError.message : String(parseError),
          help: 'Please ensure the request body is valid JSON and contains the required fields'
        },
        { status: 400 }
      );
    }

    // Create or update email account
    try {
      const emailAccount = await prisma.emailAccount.upsert({
        where: {
          unipileAccountId: data.account_id
        },
        update: {
          isActive: true
        },
        create: {
          unipileAccountId: data.account_id,
          organizationId: data.name,
          isActive: true,
          name: 'Connected Email Account',
          email: 'pending@example.com' // Will be updated when we receive first message
        }
      });
      
      console.log('Email account stored:', {
        id: emailAccount.id,
        unipileAccountId: emailAccount.unipileAccountId
      });
      
      return NextResponse.json({
        success: true,
        accountId: emailAccount.id
      });
    } catch (error) {
      console.error('Failed to store account:', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        type: typeof error
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to process webhook',
          details: error instanceof Error ? error.message : String(error),
          help: 'Please check the request format and try again'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    // Log the full error details
    console.error('Webhook error:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      type: typeof error
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : String(error),
        help: 'Please check the request format and try again'
      },
      { status: 500 }
    );
  }
} 