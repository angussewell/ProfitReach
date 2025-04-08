import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Constants
const PLACEHOLDER_ORG_ID = 'org_test_alpha'; // Fallback for testing

// Valid lead status values
const VALID_LEAD_STATUSES = [
  'New',
  'Contacted',
  'Qualified', 
  'Unqualified',
  'Replied',
  'Customer',
  'Churned'
];

// Type for the required fields in the request body
type UpdateContactRequest = {
  firstName?: string;
  lastName?: string;
  email: string;
  title?: string;
  currentCompanyName?: string;
  companyWebsiteUrl?: string;
  companyLinkedinUrl?: string;
  leadStatus?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  githubUrl?: string;
  country?: string;
  city?: string;
  state?: string;
  phoneNumbers?: {
    main?: string;
    [key: string]: any;
  } | null;
  additionalData?: {
    [key: string]: any;
  };
  tags?: string[]; // Array of tag names
  
  // Newly added fields
  phone?: string;
  prospectResearch?: string;
  companyResearch?: string;
  previousMessageCopy?: string;
  previousMessageSubjectLine?: string;
  previousMessageId?: string;
  threadId?: string;
  emailSender?: string;
  originalOutboundRepName?: string;
  dateOfResearch?: string | Date;
  allEmployees?: string;
  linkedInPosts?: string;
  linkedInProfilePhoto?: string;
  initialLinkedInMessageCopy?: string;
  providerId?: string;
  mutualConnections?: string;
  additionalResearch?: string;
  currentScenario?: string;
  outboundRepName?: string;
  seoDescription?: string;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const contactId = params.contactId;
    
    // Validate that the contactId exists
    if (!contactId) {
      return NextResponse.json(
        { message: 'Contact ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    
    // Basic validation
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Extract and destructure parameters from the request
    const { 
      firstName, 
      lastName, 
      email, 
      title, 
      currentCompanyName, 
      companyWebsiteUrl,
      companyLinkedinUrl,
      leadStatus,
      linkedinUrl,
      twitterUrl,
      facebookUrl,
      githubUrl,
      country,
      city,
      state,
      phoneNumbers,
      additionalData,
      tags,
      // Newly added fields
      phone,
      prospectResearch,
      companyResearch,
      previousMessageCopy,
      previousMessageSubjectLine,
      previousMessageId,
      threadId,
      emailSender,
      originalOutboundRepName,
      dateOfResearch,
      allEmployees,
      linkedInPosts,
      linkedInProfilePhoto,
      initialLinkedInMessageCopy,
      providerId,
      mutualConnections,
      additionalResearch,
      currentScenario,
      outboundRepName,
      seoDescription
    } = body as UpdateContactRequest;
    
    // Email is required
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Lead status validation
    if (leadStatus && !VALID_LEAD_STATUSES.includes(leadStatus)) {
      return NextResponse.json(
        { 
          message: 'Invalid lead status', 
          validOptions: VALID_LEAD_STATUSES 
        },
        { status: 400 }
      );
    }
    
    // URL format validation for linkedinUrl if provided
    if (linkedinUrl && !linkedinUrl.startsWith('https://') && !linkedinUrl.startsWith('http://')) {
      return NextResponse.json(
        { message: 'LinkedIn URL must start with http:// or https://' },
        { status: 400 }
      );
    }
    
    // Get organization ID from session
    const session = await getServerSession(authOptions);
    const organizationId = session?.user?.organizationId || PLACEHOLDER_ORG_ID;
    
    console.log('Using organization ID for contact update:', organizationId);
    
    // First verify that the contact exists and belongs to this organization
    try {
      const existingContact = await prisma.contacts.findUnique({
        where: {
          id: contactId,
          organizationId,
        },
        select: { id: true }
      });
      
      if (!existingContact) {
        return NextResponse.json(
          { message: 'Contact not found or not authorized to update' },
          { status: 404 }
        );
      }
    } catch (verifyError) {
      console.error('Error verifying contact ownership:', verifyError);
      return NextResponse.json(
        { message: 'Error verifying contact' },
        { status: 500 }
      );
    }
    
    try {
      // Process leadStatus - store in both leadStatus field and additionalData for backwards compatibility
      let updatedAdditionalData = additionalData || {};
      if (leadStatus) {
        // Store status in additionalData too for backward compatibility
        updatedAdditionalData = {
          ...updatedAdditionalData,
          status: leadStatus
        };
      }
      
      // Convert to JSONB
      const jsonbData = JSON.stringify(updatedAdditionalData);
      
      // Log the update operation for debugging
      console.log(`Updating contact ${contactId} for organization ${organizationId}`);
      
      // Convert phoneNumbers to JSONB
      const phoneNumbersJson = phoneNumbers ? JSON.stringify(phoneNumbers) : null;
      
      // Start a transaction to ensure all operations succeed or fail together
      await prisma.$transaction(async (prisma) => {
        // 1. Update the contact record
        await prisma.$executeRaw`
          UPDATE "Contacts"
          SET 
            "firstName" = ${firstName ?? null},
            "lastName" = ${lastName ?? null},
            email = ${email},
            title = ${title ?? null},
            "currentCompanyName" = ${currentCompanyName ?? null},
            "companyWebsiteUrl" = ${companyWebsiteUrl ?? null},
            "companyLinkedinUrl" = ${companyLinkedinUrl ?? null},
            "leadStatus" = ${leadStatus ?? null},
            "linkedinUrl" = ${linkedinUrl ?? null},
            "twitterUrl" = ${twitterUrl ?? null},
            "facebookUrl" = ${facebookUrl ?? null},
            "githubUrl" = ${githubUrl ?? null},
            country = ${country ?? null},
            city = ${city ?? null},
            state = ${state ?? null},
            "phoneNumbers" = ${phoneNumbersJson ? `${phoneNumbersJson}::jsonb` : null},
            "additionalData" = ${jsonbData}::jsonb,
            
            /* Newly added fields */
            "phone" = ${phone ?? null},
            "prospectResearch" = ${prospectResearch ?? null},
            "companyResearch" = ${companyResearch ?? null},
            "previousMessageCopy" = ${previousMessageCopy ?? null},
            "previousMessageSubjectLine" = ${previousMessageSubjectLine ?? null},
            "previousMessageId" = ${previousMessageId ?? null},
            "threadId" = ${threadId ?? null},
            "emailSender" = ${emailSender ?? null},
            "originalOutboundRepName" = ${originalOutboundRepName ?? null},
            "dateOfResearch" = ${dateOfResearch ? new Date(dateOfResearch) : null},
            "allEmployees" = ${allEmployees ?? null},
            "linkedInPosts" = ${linkedInPosts ?? null},
            "linkedInProfilePhoto" = ${linkedInProfilePhoto ?? null},
            "initialLinkedInMessageCopy" = ${initialLinkedInMessageCopy ?? null},
            "providerId" = ${providerId ?? null},
            "mutualConnections" = ${mutualConnections ?? null},
            "additionalResearch" = ${additionalResearch ?? null},
            "currentScenario" = ${currentScenario ?? null},
            "outboundRepName" = ${outboundRepName ?? null},
            "seoDescription" = ${seoDescription ?? null},
            
            "updatedAt" = NOW()
          WHERE 
            id = ${contactId}
            AND "organizationId" = ${organizationId}
        `;
        
        // 2. Handle tags if provided
        if (Array.isArray(tags)) {
          // Delete existing contact-tag relationships for this contact
          await prisma.$executeRaw`
            DELETE FROM "ContactTags"
            WHERE "contactId" = ${contactId}
          `;
          
          // Process each tag
          for (const tagName of tags) {
            if (!tagName.trim()) continue; // Skip empty tags
            
            // Try to find the tag first
            const existingTags = await prisma.$queryRaw`
              SELECT id FROM "Tags" 
              WHERE "organizationId" = ${organizationId} 
              AND name = ${tagName}
              LIMIT 1
            `;
            
            let tagId;
            
            if (Array.isArray(existingTags) && existingTags.length > 0) {
              // Tag exists, use its ID
              tagId = existingTags[0].id;
            } else {
              // Tag doesn't exist, create it
              // Generate a UUID for the new tag
              const newTagsResult = await prisma.$executeRaw`
                INSERT INTO "Tags" (id, "organizationId", name, "createdAt", "updatedAt")
                VALUES (gen_random_uuid(), ${organizationId}, ${tagName}, NOW(), NOW())
                ON CONFLICT ("organizationId", name) DO NOTHING
                RETURNING id
              `;
              
              // Fetch the newly created tag's ID
              const newTags = await prisma.$queryRaw`
                SELECT id FROM "Tags" 
                WHERE "organizationId" = ${organizationId} 
                AND name = ${tagName}
                LIMIT 1
              `;
              
              if (Array.isArray(newTags) && newTags.length > 0) {
                tagId = newTags[0].id;
              } else {
                console.error(`Failed to create or find tag: ${tagName}`);
                continue; // Skip this tag
              }
            }
            
            // Create the contact-tag relationship
            await prisma.$executeRaw`
              INSERT INTO "ContactTags" ("contactId", "tagId", "createdAt")
              VALUES (${contactId}, ${tagId}::uuid, NOW())
              ON CONFLICT ("contactId", "tagId") DO NOTHING
            `;
          }
        }
      });
      
      return NextResponse.json(
        { 
          message: 'Contact updated successfully',
          contactId: contactId
        },
        { status: 200 }
      );
    } catch (dbError) {
      console.error('Database error updating contact:', dbError);
      
      // Check for duplicate email error
      if (dbError instanceof Error && dbError.message.includes('duplicate key')) {
        return NextResponse.json(
          { message: 'A different contact with this email already exists' },
          { status: 409 }
        );
      }
      
      // Check for foreign key constraint errors
      if (dbError instanceof Error && dbError.message.includes('foreign key constraint')) {
        return NextResponse.json(
          { message: 'Referenced entity does not exist' },
          { status: 400 }
        );
      }
      
      // Other database errors
      return NextResponse.json(
        { message: 'Database error while updating contact' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in contact update API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support PATCH for partial updates
export { PUT as PATCH };

// Implementation for DELETE method to delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const contactId = params.contactId;
    
    // Validate that the contactId exists
    if (!contactId) {
      return NextResponse.json(
        { message: 'Contact ID is required' },
        { status: 400 }
      );
    }
    
    // Get organization ID from session
    const session = await getServerSession(authOptions);
    const organizationId = session?.user?.organizationId || PLACEHOLDER_ORG_ID;
    
    console.log('Using organization ID for contact deletion:', organizationId);
    
    // First verify that the contact exists and belongs to this organization
    try {
      const existingContact = await prisma.contacts.findUnique({
        where: {
          id: contactId,
          organizationId,
        },
        select: { id: true }
      });
      
      if (!existingContact) {
        return NextResponse.json(
          { message: 'Contact not found or not authorized to delete' },
          { status: 404 }
        );
      }
    } catch (verifyError) {
      console.error('Error verifying contact ownership:', verifyError);
      return NextResponse.json(
        { message: 'Error verifying contact' },
        { status: 500 }
      );
    }
    
    try {
      // Log the delete operation for debugging
      console.log(`Deleting contact ${contactId} for organization ${organizationId}`);
      
      // Use $executeRaw for direct SQL execution as specified
      await prisma.$executeRaw`
        DELETE FROM "Contacts"
        WHERE 
          id = ${contactId}
          AND "organizationId" = ${organizationId}
      `;
      
      return NextResponse.json(
        { 
          message: 'Contact deleted successfully',
          contactId: contactId
        },
        { status: 200 }
      );
    } catch (dbError) {
      console.error('Database error deleting contact:', dbError);
      
      // Check for foreign key constraint errors
      if (dbError instanceof Error && dbError.message.includes('foreign key constraint')) {
        return NextResponse.json(
          { message: 'Cannot delete contact due to existing relationships' },
          { status: 400 }
        );
      }
      
      // Other database errors
      return NextResponse.json(
        { message: 'Database error while deleting contact' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in contact delete API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
