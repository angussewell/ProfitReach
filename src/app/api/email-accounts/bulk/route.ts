import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for email account validation (same as single account)
const emailAccountSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  isActive: z.boolean().optional().default(true),
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

    // Process each record
    for (const record of records) {
      try {
        // Map CSV fields to our schema
        const accountData = {
          email: record.email || record.Email,
          name: `${record['First Name'] || record.FirstName || ''} ${record['Last Name'] || record.LastName || ''}`.trim(),
          password: record['SMTP Password'] || record.SMTPPassword,
          host: record['SMTP Host'] || record.SMTPHost,
          port: parseInt(record['SMTP Port'] || record.SMTPPort),
          isActive: true,
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

        // Create the account
        await prisma.emailAccount.create({
          data: {
            ...accountData,
            organizationId: session.user.organizationId,
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