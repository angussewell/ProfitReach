import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Mail360Client } from '@/lib/mail360';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

// Schema for email account validation
const emailAccountSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  incomingPassword: z.string().min(1),
  isGmail: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  incomingServer: z.string().min(1),
  incomingServerPort: z.number().min(1),
  outgoingServer: z.string().min(1),
  outgoingServerPort: z.number().min(1),
  smtpConnection: z.number().optional(),
});

export async function GET() {
  try {
    console.log('Starting GET request for email accounts');
    const session = await getServerSession(authOptions);
    console.log('Session data:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      organizationId: session?.user?.organizationId,
      headers: headers(),
      timestamp: new Date().toISOString()
    });

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

    const data = await request.json();
    console.log('Received request data:', data);
    
    const validatedData = emailAccountSchema.parse(data);
    console.log('Validated data:', validatedData);

    const mail360 = new Mail360Client();
    
    // Transform data for Mail360
    const mail360Payload = {
      emailid: validatedData.email,
      accountType: 2, // Sync account type (using number instead of string)
      incomingUser: validatedData.email,
      incomingPasswd: validatedData.incomingPassword,
      incomingServer: validatedData.incomingServer,
      incomingServerPort: validatedData.incomingServerPort,
      isCustomSmtp: true, // Using boolean instead of string
      outgoingServer: validatedData.outgoingServer,
      outgoingServerPort: validatedData.outgoingServerPort,
      smtpConnection: validatedData.outgoingServerPort === 587 ? 2 : 1, // Use STARTTLS for 587, SSL for others
      outgoingAuth: true, // Using boolean instead of string
      outgoingUser: validatedData.email,
      outgoingPasswd: validatedData.incomingPassword,
      gmailTypeSync: false // Using boolean instead of string
    };

    console.log('Creating Mail360 account with payload:', {
      ...mail360Payload,
      incomingPasswd: '***',
      outgoingPasswd: '***'
    });
    const accountKey = await mail360.addSyncAccount(mail360Payload);
    console.log('Mail360 account created with key:', accountKey);

    console.log('Saving to database...');
    try {
      const emailAccount = await prisma.emailAccount.create({
        data: {
          email: validatedData.email,
          name: validatedData.name,
          password: validatedData.incomingPassword,
          outgoingServer: validatedData.outgoingServer,
          outgoingServerPort: validatedData.outgoingServerPort,
          mail360AccountKey: accountKey,
          organizationId: session.user.organizationId,
          isActive: true,
          isGmail: validatedData.isGmail,
          smtpConnection: validatedData.outgoingServerPort === 587 ? 2 : 1,
          incomingServer: validatedData.incomingServer,
          incomingServerPort: validatedData.incomingServerPort,
          incomingUser: validatedData.email,
          incomingPassword: validatedData.incomingPassword,
          sslEnabled: validatedData.outgoingServerPort === 587 ? false : true,
          startTls: validatedData.outgoingServerPort === 587 ? true : false,
          saveSentCopy: true
        }
      });
      console.log('Successfully saved to database');
      
      // Don't send sensitive data back
      const { password, ...safeAccount } = emailAccount;
      return NextResponse.json(safeAccount);
    } catch (dbError) {
      console.error('Database error:', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
        accountKey
      });
      return NextResponse.json(
        { error: 'Failed to save email account to database', details: dbError instanceof Error ? dbError.message : String(dbError) },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in POST /api/email-accounts:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create email account' },
      { status: 500 }
    );
  }
} 