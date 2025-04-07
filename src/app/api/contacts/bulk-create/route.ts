import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Constants
const PLACEHOLDER_ORG_ID = 'org_test_alpha'; // Fallback for testing
const BATCH_SIZE = 250; // Process in batches to avoid overly large SQL statements

// Type for the bulk create request
type BulkCreateRequest = {
  contacts: Array<{
    firstName?: string;
    lastName?: string;
    email: string;
    title?: string;
    currentCompanyName?: string;
    leadStatus?: string;
    linkedinUrl?: string;
    city?: string;
    state?: string;
    country?: string;
    companyWebsiteUrl?: string;
    twitterUrl?: string;
    facebookUrl?: string;
    githubUrl?: string;
    companyLinkedinUrl?: string;
    additionalData?: Record<string, any>;
    [key: string]: any;
  }>;
};

// Validation helper
const validateContact = (contact: any, index: number) => {
  const errors: string[] = [];
  
  // Email validation
  if (!contact.email) {
    errors.push(`Row ${index + 1}: Email is required`);
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    errors.push(`Row ${index + 1}: Invalid email format: ${contact.email}`);
  }
  
  // Add other validations as needed
  
  return errors;
};

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Basic validation
    if (!body?.contacts || !Array.isArray(body.contacts) || body.contacts.length === 0) {
      return NextResponse.json(
        { message: 'Invalid request: contacts array is required' },
        { status: 400 }
      );
    }
    
    const { contacts } = body as BulkCreateRequest;
    
    // Validate each contact and collect errors
    const validationErrors: string[] = [];
    contacts.forEach((contact, index) => {
      const errors = validateContact(contact, index);
      validationErrors.push(...errors);
    });
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          message: 'Validation errors in contacts data',
          errors: validationErrors.map(err => ({ message: err }))
        },
        { status: 400 }
      );
    }
    
    // Get the organization ID from the session
    const session = await getServerSession(authOptions);
    const organizationId = session?.user?.organizationId || PLACEHOLDER_ORG_ID;
    
    // Log the organization ID for debugging
    console.log('Using organization ID:', organizationId);
    
    // Process contacts in batches
    const results = {
      successCount: 0,
      errorCount: 0,
      errors: [] as Array<{ row: number; message: string }>
    };
    
    // Split contacts into batches
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      
      try {
        // Start building our SQL query
        // This is a multi-row insert using VALUES lists
        let query = `
          INSERT INTO "Contacts" (
            id, 
            "firstName", 
            "lastName", 
            email, 
            title,
            "currentCompanyName",
            "leadStatus",
            "linkedinUrl",
            city,
            state,
            country,
            "companyWebsiteUrl",
            "twitterUrl",
            "facebookUrl",
            "githubUrl",
            "companyLinkedinUrl",
            "organizationId", 
            "additionalData", 
            "createdAt", 
            "updatedAt"
          )
          VALUES 
        `;
        
        // Generate parameter placeholders
        const placeholders: string[] = [];
        const values: any[] = [];
        
        batch.forEach((contact) => {
          // Add a VALUES clause for this contact
          placeholders.push(`
            (
              gen_random_uuid(), 
              $${values.length + 1}, 
              $${values.length + 2}, 
              $${values.length + 3}, 
              $${values.length + 4}, 
              $${values.length + 5}, 
              $${values.length + 6}, 
              $${values.length + 7}, 
              $${values.length + 8}, 
              $${values.length + 9}, 
              $${values.length + 10}, 
              $${values.length + 11}, 
              $${values.length + 12}, 
              $${values.length + 13}, 
              $${values.length + 14}, 
              $${values.length + 15}, 
              $${values.length + 16}, 
              $${values.length + 17}::jsonb, 
              NOW(), 
              NOW()
            )
          `);
          
          // Push the actual values
          values.push(
            contact.firstName || null,
            contact.lastName || null,
            contact.email,
            contact.title || null,
            contact.currentCompanyName || null,
            contact.leadStatus || null,
            contact.linkedinUrl || null,
            contact.city || null,
            contact.state || null,
            contact.country || null,
            contact.companyWebsiteUrl || null,
            contact.twitterUrl || null,
            contact.facebookUrl || null,
            contact.githubUrl || null,
            contact.companyLinkedinUrl || null,
            organizationId,
            JSON.stringify(contact.additionalData || {})
          );
        });
        
        // Complete the query without ON CONFLICT as there's no unique constraint
        query += placeholders.join(', ');
        query += `
          RETURNING id
        `;
        
        // Execute the query
        const result = await prisma.$queryRawUnsafe<{ id: string }[]>(query, ...values);
        
        // Update success count
        results.successCount += result.length;
        
        // Calculate skipped/error count for this batch
        const skipCount = batch.length - result.length;
        if (skipCount > 0) {
          results.errorCount += skipCount;
          results.errors.push({
            row: i + 1,
            message: `${skipCount} contact(s) skipped due to duplicate email addresses`
          });
        }
      } catch (error) {
        console.error(`Error inserting batch starting at row ${i + 1}:`, error);
        
        // Add all contacts in this failed batch to the error count
        results.errorCount += batch.length;
        results.errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : 'Unknown database error'
        });
      }
    }
    
    // Return the results
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Error in bulk contact creation API:', error);
    
    return NextResponse.json(
      { 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
