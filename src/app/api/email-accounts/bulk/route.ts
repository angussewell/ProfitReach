import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Mail360Client } from '@/lib/mail360';

// Schema for email account validation
const emailAccountSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  incomingUser: z.string().min(1),
  incomingPassword: z.string().min(1),
  incomingServer: z.string().min(1),
  incomingServerPort: z.number().int().min(1).max(65535),
  outgoingUser: z.string().min(1),
  outgoingPassword: z.string().min(1),
  outgoingServer: z.string().min(1),
  outgoingServerPort: z.number().int().min(1).max(65535),
});

// Simple CSV parser that handles headers and basic CSV format
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return []; // Need at least headers and one data row

  const headers = lines[0].split(',').map(header => header.trim());
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim());
    if (values.length !== headers.length) continue; // Skip malformed lines

    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index];
    });
    records.push(record);
  }

  return records;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read and parse CSV
    const csvText = await file.text();
    const records = parseCSV(csvText);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const mail360 = new Mail360Client();

    // Process each record
    for (const record of records) {
      try {
        // Map CSV fields to our schema
        const name = [record['First Name'] || '', record['Last Name'] || ''].filter(Boolean).join(' ');
        
        const accountData = {
          email: record.email || record['Email'],
          name: name || 'Unknown',
          incomingUser: record['IMAP Username'] || record.email || record['Email'],
          incomingPassword: record['IMAP Password'],
          incomingServer: record['IMAP Host'],
          incomingServerPort: parseInt(record['IMAP Port']),
          outgoingUser: record['SMTP Username'] || record['IMAP Username'] || record.email || record['Email'],
          outgoingPassword: record['SMTP Password'] || record['IMAP Password'],
          outgoingServer: record['SMTP Host'],
          outgoingServerPort: parseInt(record['SMTP Port']),
        };

        // Validate the data
        const validationResult = emailAccountSchema.safeParse(accountData);
        if (!validationResult.success) {
          throw new Error(`Validation failed for ${accountData.email}: ${validationResult.error.message}`);
        }

        // Check for existing account
        const existingAccount = await prisma.emailAccount.findFirst({
          where: {
            email: accountData.email,
            organizationId: session.user.organizationId,
          },
        });

        if (existingAccount) {
          throw new Error(`Email account ${accountData.email} already exists`);
        }

        // Create Mail360 account
        const mail360AccountKey = await mail360.addSyncAccount({
          emailid: accountData.email,
          accountType: 2,  // Integer for sync account
          incomingUser: accountData.incomingUser,
          incomingPasswd: accountData.incomingPassword,
          incomingServer: accountData.incomingServer,
          incomingServerPort: accountData.incomingServerPort,
          isCustomSmtp: true,  // Boolean for custom SMTP
          outgoingServer: accountData.outgoingServer,
          outgoingServerPort: accountData.outgoingServerPort,
          smtpConnection: accountData.outgoingServerPort === 587 ? 2 : 1,  // Use STARTTLS for 587, SSL for others
          outgoingAuth: true,  // Boolean for auth
          outgoingUser: accountData.outgoingUser,
          outgoingPasswd: accountData.outgoingPassword,
          gmailTypeSync: false  // Boolean for non-Gmail
        });

        // Create the account in our database with smart defaults
        await prisma.emailAccount.create({
          data: {
            email: accountData.email,
            name: accountData.name,
            password: accountData.outgoingPassword,
            host: accountData.outgoingServer,
            port: accountData.outgoingServerPort,
            organizationId: session.user.organizationId,
            mail360AccountKey,
            smtpConnection: 1, // Default to SSL
            isGmail: false,
            incomingServer: accountData.incomingServer,
            incomingServerPort: accountData.incomingServerPort,
            incomingUser: accountData.incomingUser,
            incomingPassword: accountData.incomingPassword,
            sslEnabled: true, // Default to true
            startTls: false, // Default to false
            saveSentCopy: true, // Default to true
            syncFromDate: new Date(), // Default to current date
            isActive: true, // Default to active
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error processing bulk upload:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk upload' },
      { status: 500 }
    );
  }
} 