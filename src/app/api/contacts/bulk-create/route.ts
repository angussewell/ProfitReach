import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomUUID } from 'crypto'; // Import for UUID generation

// Constants
const PLACEHOLDER_ORG_ID = 'org_test_alpha'; // Fallback for testing
// BATCH_SIZE is no longer needed for the insertion logic itself, but might be useful elsewhere if added later.
// const BATCH_SIZE = 100; // Example batch size if we were batching $executeRaw calls (not needed for single-row approach)
const DEBUG_MODE = true; // Set to true to enable detailed logging

// Type for the bulk create request (assuming it remains the same)
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
    phone?: string;
    seoDescription?: string;
    scenarioName?: string;
    additionalData?: Record<string, any>;
    tags?: string; // Add tags field for individual contact tags from CSV
    [key: string]: any;
  }>;
  commonTags?: string[]; // Add optional common tags array
};

// Type for prepared contact data ready for insertion
type PreparedContactData = {
  id: string; // Added UUID
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string;
  title: string | null;
  currentCompanyName: string | null;
  currentCompanyId: string | null;
  leadStatus: string | null;
  linkedinUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  photoUrl: string | null;
  headline: string | null;
  companyWebsiteUrl: string | null;
  twitterUrl: string | null;
  facebookUrl: string | null;
  githubUrl: string | null;
  companyLinkedinUrl: string | null;
  employmentHistory: string; // JSON string
  phoneNumbers: string; // JSON string
  contactEmails: string; // JSON string
  lastActivityAt: Date | null;
  prospectResearch: string | null;
  companyResearch: string | null;
  previousMessageCopy: string | null;
  previousMessageSubjectLine: string | null;
  previousMessageId: string | null;
  threadId: string | null;
  emailSender: string | null;
  originalOutboundRepName: string | null;
  dateOfResearch: Date | null;
  allEmployees: string | null;
  linkedInPosts: string | null;
  linkedInProfilePhoto: string | null;
  initialLinkedInMessageCopy: string | null;
  providerId: string | null;
  mutualConnections: string | null;
  additionalResearch: string | null;
  currentScenario: string | null;
  outboundRepName: string | null;
  phone: string | null;
  seoDescription: string | null;
  scenarioName: string | null;
  emailStatus: string | null;
  organizationId: string;
  additionalData: string; // JSON string
  createdAt: Date; // Added for insertion
  updatedAt: Date; // Added for insertion
};


// Safe console logging functions (assuming they remain the same)
const safePrint = {
  log: (message: string, data?: any) => {
    if (!DEBUG_MODE) return;
    const sanitizedData = data ? sanitizeData(data) : undefined;
    console.log(`[BULK-CREATE] ${message}`, sanitizedData || '');
  },
  error: (message: string, error: any) => {
    console.error(`[BULK-CREATE ERROR] ${message}`, error);
  }
};

// Helper to sanitize data (assuming it remains the same)
const sanitizeData = (data: any): any => {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, any> = { ...data };
    if (sanitized.email) sanitized.email = maskEmail(sanitized.email);
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = sanitizeData(sanitized[key]);
      }
    }
    return sanitized;
  }
  return data;
};

// Helper to mask email (assuming it remains the same)
const maskEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '[invalid email]';
  const parts = email.split('@');
  if (parts.length !== 2) return '[invalid email format]';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length > 2 ? `${name.charAt(0)}***${name.charAt(name.length - 1)}` : '***';
  return `${maskedName}@${domain}`;
};

// Validation error categorization (assuming it remains the same)
type ValidationErrorType = 'missingField' | 'invalidFormat' | 'typeMismatch' | 'lengthExceeded' | 'structureError' | 'other';

// Relaxed validation helper (assuming it remains the same)
const validateContact = (contact: any, index: number): Array<{field: string, message: string, type: ValidationErrorType}> => {
  const errors: Array<{field: string, message: string, type: ValidationErrorType}> = [];
  safePrint.log(`Validating contact at index ${index}:`, contact);
  if (!contact || typeof contact !== 'object') {
    return [{ field: 'contact', message: `Row ${index + 1}: Contact data is not a valid object`, type: 'structureError' }];
  }
  if (!contact.email) {
    errors.push({ field: 'email', message: `Row ${index + 1}: Email is required`, type: 'missingField' });
  } else if (typeof contact.email !== 'string') {
    errors.push({ field: 'email', message: `Row ${index + 1}: Email must be a string`, type: 'typeMismatch' });
  } else {
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(contact.email)) {
      errors.push({ field: 'email', message: `Row ${index + 1}: Invalid email format: ${maskEmail(contact.email)}`, type: 'invalidFormat' });
    }
  }
  if (contact.dateOfResearch !== undefined && contact.dateOfResearch !== null) {
    if (typeof contact.dateOfResearch !== 'string' && typeof contact.dateOfResearch !== 'object') { // Allow Date objects
        errors.push({ field: 'dateOfResearch', message: `Row ${index + 1}: dateOfResearch should be a string or Date object`, type: 'typeMismatch' });
    }
  }
  const stringLengthValidations = [
    { field: 'firstName', maxLength: 100 }, { field: 'lastName', maxLength: 100 }, { field: 'title', maxLength: 200 },
    { field: 'city', maxLength: 100 }, { field: 'state', maxLength: 100 }, { field: 'country', maxLength: 100 },
    { field: 'currentCompanyName', maxLength: 255 }
  ];
  for (const validation of stringLengthValidations) {
    const { field, maxLength } = validation;
    if (contact[field] && typeof contact[field] === 'string' && contact[field].length > maxLength) {
      errors.push({ field, message: `Row ${index + 1}: ${field} exceeds maximum length of ${maxLength} characters`, type: 'lengthExceeded' });
    }
  }
  if (contact.additionalData !== undefined && contact.additionalData !== null) {
    if (typeof contact.additionalData !== 'object') {
      errors.push({ field: 'additionalData', message: `Row ${index + 1}: additionalData must be an object`, type: 'typeMismatch' });
    }
  }
  if (errors.length > 0) {
    // Pass the errors array directly as the second argument (type is 'any')
    safePrint.error(`Validation errors found for contact at index ${index}:`, errors);
  }
  return errors;
};


export async function POST(request: NextRequest) {
  let organizationId = PLACEHOLDER_ORG_ID; // Default
  try {
    console.log('===== BULK CONTACT IMPORT API CALLED =====');
    const session = await getServerSession(authOptions);
    organizationId = session?.user?.organizationId || PLACEHOLDER_ORG_ID;
    console.log('Using organization ID:', organizationId);

    // --- Request Body Parsing and Initial Validation ---
    let body: BulkCreateRequest;
    try {
      body = await request.json();
      safePrint.log('Request body parsed successfully');
    } catch (parseError) {
      console.error('!!!!! CRITICAL: JSON PARSE ERROR !!!!', parseError);
      return NextResponse.json({ message: 'Invalid request format: Could not parse JSON body.' }, { status: 400 });
    }

    if (!body?.contacts || !Array.isArray(body.contacts) || body.contacts.length === 0) {
      safePrint.error('Invalid request structure: contacts array is missing, not an array, or empty.', new Error('Invalid contacts array'));
      return NextResponse.json({ message: 'Invalid request: contacts array is required and must not be empty' }, { status: 400 });
    }
    // Destructure contacts and commonTags (defaulting to empty array)
    const { contacts, commonTags = [] } = body;
    safePrint.log(`Received ${contacts.length} contacts for processing.`);
    safePrint.log(`Received ${commonTags.length} common tags to apply.`);

    // --- Row-by-Row Validation and Duplicate Check ---
    const validContactsToInsert: PreparedContactData[] = [];
    const skippedDuplicates: Array<{ row: number; email: string; reason: string }> = [];
    const failedValidationRowsInfo: Array<{ row: number; errors: any[]; contact: any }> = [];
    const now = new Date(); // Use consistent timestamp for all inserts in this run

    for (let index = 0; index < contacts.length; index++) {
      const contact = contacts[index];
      const rowIndex = index + 1;

      if (!contact || typeof contact !== 'object') {
        failedValidationRowsInfo.push({ row: rowIndex, errors: [{ field: 'contact', message: `Row ${rowIndex}: Contact data is not a valid object`, type: 'structureError' }], contact: sanitizeData(contact) });
        continue;
      }

      const validationErrors = validateContact(contact, index);
      if (validationErrors.length > 0) {
        failedValidationRowsInfo.push({ row: rowIndex, errors: validationErrors, contact: sanitizeData(contact) });
      } else {
        // Initial validation passed, check for global duplicate email
        safePrint.log(`[Row ${rowIndex}] Initial validation passed. Checking for existing email: ${contact.email}`);
        try {
            const existingContact = await prisma.contacts.findFirst({
              where: { email: contact.email },
              select: { id: true }
            });

            if (existingContact) {
              safePrint.log(`[Row ${rowIndex}] Duplicate email found. Skipping.`);
              skippedDuplicates.push({ row: rowIndex, email: contact.email, reason: 'Duplicate email exists globally' });
            } else {
              // Email is unique, prepare data for insertion
              safePrint.log(`[Row ${rowIndex}] Email is unique. Preparing for insertion batch.`);

              // Prepare data (handle dates, fullName, JSON stringify, UUID)
              let dateOfResearch: Date | null = null;
              if (contact.dateOfResearch) {
                  try {
                      dateOfResearch = new Date(contact.dateOfResearch);
                      if (isNaN(dateOfResearch.getTime())) dateOfResearch = null;
                  } catch { dateOfResearch = null; }
              }
              const fullName = contact.fullName || (contact.firstName && contact.lastName ? `${contact.firstName} ${contact.lastName}` : (contact.firstName || contact.lastName || null));
              let lastActivityAt: Date | null = null;
              if (contact.lastActivityAt) {
                  try {
                      lastActivityAt = new Date(contact.lastActivityAt);
                      if (isNaN(lastActivityAt.getTime())) lastActivityAt = null;
                  } catch { lastActivityAt = null; }
              }

              const preparedData: PreparedContactData = {
                id: randomUUID(), // Generate UUID here
                firstName: contact.firstName || null,
                lastName: contact.lastName || null,
                fullName: fullName,
                email: contact.email,
                title: contact.title || null,
                currentCompanyName: contact.currentCompanyName || null,
                currentCompanyId: contact.currentCompanyId || null,
                leadStatus: contact.leadStatus !== undefined ? contact.leadStatus : null,
                linkedinUrl: contact.linkedinUrl || null,
                city: contact.city || null,
                state: contact.state || null,
                country: contact.country || null,
                photoUrl: contact.photoUrl || null,
                headline: contact.headline || null,
                companyWebsiteUrl: contact.companyWebsiteUrl || null,
                twitterUrl: contact.twitterUrl || null,
                facebookUrl: contact.facebookUrl || null,
                githubUrl: contact.githubUrl || null,
                companyLinkedinUrl: contact.companyLinkedinUrl || null,
                employmentHistory: JSON.stringify(contact.employmentHistory || {}),
                phoneNumbers: JSON.stringify(contact.phoneNumbers || {}),
                contactEmails: JSON.stringify(contact.contactEmails || {}),
                lastActivityAt: lastActivityAt,
                prospectResearch: contact.prospectResearch || null,
                companyResearch: contact.companyResearch || null,
                previousMessageCopy: contact.previousMessageCopy || null,
                previousMessageSubjectLine: contact.previousMessageSubjectLine || null,
                previousMessageId: contact.previousMessageId || null,
                threadId: contact.threadId || null,
                emailSender: contact.emailSender || null,
                originalOutboundRepName: contact.originalOutboundRepName || null,
                dateOfResearch: dateOfResearch,
                allEmployees: contact.allEmployees || null,
                linkedInPosts: contact.linkedInPosts || null,
                linkedInProfilePhoto: contact.linkedInProfilePhoto || null,
                initialLinkedInMessageCopy: contact.initialLinkedInMessageCopy || null,
                providerId: contact.providerId || null,
                mutualConnections: contact.mutualConnections || null,
                additionalResearch: contact.additionalResearch || null,
                currentScenario: contact.currentScenario || null,
                outboundRepName: contact.outboundRepName || null,
                phone: contact.phone || null,
                seoDescription: contact.seoDescription || null,
                scenarioName: contact.scenarioName || null,
                emailStatus: contact.emailStatus || null,
                organizationId: organizationId,
                additionalData: JSON.stringify(contact.additionalData || {}),
                createdAt: now, // Use consistent timestamp
                updatedAt: now  // Use consistent timestamp
              };
              validContactsToInsert.push(preparedData);
            }
        } catch (dbCheckError) {
            // Handle potential error during the findFirst check
            safePrint.error(`[Row ${rowIndex}] DB Error checking email ${contact.email}:`, dbCheckError);
            // Treat as validation failure for this row
            failedValidationRowsInfo.push({
                row: rowIndex,
                errors: [{ field: 'email', message: `Database error during duplicate check: ${dbCheckError instanceof Error ? dbCheckError.message : 'Unknown DB error'}`, type: 'other' }],
                contact: sanitizeData(contact)
            });
        }
      }
    } // End of for loop processing each contact

    safePrint.log(`Processing complete: ${validContactsToInsert.length} valid for insertion, ${failedValidationRowsInfo.length} failed validation, ${skippedDuplicates.length} skipped duplicates`);

    // --- Database Insertion within a Transaction ---
    let actualSuccessCount = 0;
    const databaseErrorsInfo: Array<{ rowIndex?: number; email?: string; message: string; error?: any }> = [];

    if (validContactsToInsert.length > 0) {
      safePrint.log(`Attempting to insert ${validContactsToInsert.length} contacts within a transaction...`);
      try {
        actualSuccessCount = await prisma.$transaction(async (tx) => {
          let successfulInsertsInTx = 0;
          for (const contactData of validContactsToInsert) {
            try {
              // Use parameterized $executeRaw for single-row insert
              const result = await tx.$executeRaw`
                INSERT INTO "Contacts" (
                  id, "firstName", "lastName", "fullName", email, title, "currentCompanyName", "currentCompanyId",
                  "leadStatus", "linkedinUrl", city, state, country, "photoUrl", headline, "companyWebsiteUrl",
                  "twitterUrl", "facebookUrl", "githubUrl", "companyLinkedinUrl", "employmentHistory", "phoneNumbers",
                  "contactEmails", "lastActivityAt", "prospectResearch", "companyResearch", "previousMessageCopy",
                  "previousMessageSubjectLine", "previousMessageId", "threadId", "emailSender", "originalOutboundRepName",
                  "dateOfResearch", "allEmployees", "linkedInPosts", "linkedInProfilePhoto", "initialLinkedInMessageCopy",
                  "providerId", "mutualConnections", "additionalResearch", "currentScenario", "outboundRepName",
                  "phone", "seoDescription", "scenarioName", "emailStatus", "organizationId", "additionalData",
                  "createdAt", "updatedAt"
                ) VALUES (
                  ${contactData.id}, ${contactData.firstName}, ${contactData.lastName}, ${contactData.fullName}, ${contactData.email},
                  ${contactData.title}, ${contactData.currentCompanyName}, ${contactData.currentCompanyId}, ${contactData.leadStatus},
                  ${contactData.linkedinUrl}, ${contactData.city}, ${contactData.state}, ${contactData.country}, ${contactData.photoUrl},
                  ${contactData.headline}, ${contactData.companyWebsiteUrl}, ${contactData.twitterUrl}, ${contactData.facebookUrl},
                  ${contactData.githubUrl}, ${contactData.companyLinkedinUrl}, ${contactData.employmentHistory}::jsonb,
                  ${contactData.phoneNumbers}::jsonb, ${contactData.contactEmails}::jsonb, ${contactData.lastActivityAt},
                  ${contactData.prospectResearch}, ${contactData.companyResearch}, ${contactData.previousMessageCopy},
                  ${contactData.previousMessageSubjectLine}, ${contactData.previousMessageId}, ${contactData.threadId},
                  ${contactData.emailSender}, ${contactData.originalOutboundRepName}, ${contactData.dateOfResearch},
                  ${contactData.allEmployees}, ${contactData.linkedInPosts}, ${contactData.linkedInProfilePhoto},
                  ${contactData.initialLinkedInMessageCopy}, ${contactData.providerId}, ${contactData.mutualConnections},
                  ${contactData.additionalResearch}, ${contactData.currentScenario}, ${contactData.outboundRepName},
                  ${contactData.phone}, ${contactData.seoDescription}, ${contactData.scenarioName}, ${contactData.emailStatus},
                  ${contactData.organizationId}, ${contactData.additionalData}::jsonb, ${contactData.createdAt}, ${contactData.updatedAt}
                )
              `;
              // $executeRaw returns the number of affected rows (should be 1 for successful insert)
              if (result === 1) {
                successfulInsertsInTx++;
                const newContactId = contactData.id; // Get the ID of the inserted contact

                // --- START: Tag Processing Logic ---
                const originalContactData = contacts.find(c => c.email === contactData.email);
                let individualTagNames: string[] = [];
                if (originalContactData?.tags && typeof originalContactData.tags === 'string') {
                    individualTagNames = originalContactData.tags.split(',').map(t => t.trim()).filter(t => t);
                    safePrint.log(`[Contact ${newContactId}] Found individual tags:`, individualTagNames);
                }

                const uniqueTagNames = new Set([...individualTagNames, ...commonTags]);
                safePrint.log(`[Contact ${newContactId}] Combined unique tags:`, Array.from(uniqueTagNames));

                if (uniqueTagNames.size > 0) {
                    const tagIdsForContact: string[] = [];
                    try {
                        // 1. Upsert tags and get IDs
                        for (const tagName of uniqueTagNames) {
                            if (!tagName) continue; // Skip empty tag names just in case

                            const upsertResult = await tx.$queryRaw<Array<{ tagId: string }>>`
                                INSERT INTO "Tags" ("organizationId", "name", "tagId")
                                VALUES (${organizationId}, ${tagName}, gen_random_uuid())
                                ON CONFLICT ("organizationId", "name")
                                DO UPDATE SET "name" = EXCLUDED."name" -- No-op update needed for RETURNING on conflict
                                RETURNING "tagId";
                            `;
                            if (upsertResult && upsertResult.length > 0 && upsertResult[0].tagId) {
                                tagIdsForContact.push(upsertResult[0].tagId);
                            } else {
                                 safePrint.error(`[Contact ${newContactId}] Failed to upsert or retrieve tagId for tag: ${tagName}`, new Error(`Failed to upsert tag: ${tagName}`));
                                 // Log and continue, skipping this tag for this contact.
                            }
                        }
                        safePrint.log(`[Contact ${newContactId}] Upserted/found tag IDs:`, tagIdsForContact);

                        // 2. Link tags to contact (if IDs were found)
                        if (tagIdsForContact.length > 0) {
                            // Use Prisma's parameter binding for safety
                            const valuesPlaceholders = tagIdsForContact.map((_, index) => `(${newContactId}::uuid, $${index + 1}::uuid)`).join(', ');
                            const tagIdParams = tagIdsForContact; // Array of UUIDs

                            const linkQuery = `
                                INSERT INTO "ContactTags" ("contactId", "tagId")
                                VALUES ${valuesPlaceholders}
                                ON CONFLICT ("contactId", "tagId") DO NOTHING;
                            `;

                            // Execute the raw SQL for linking using parameterized query
                            const linkResult = await tx.$executeRawUnsafe(linkQuery, ...tagIdParams); // Pass tag IDs as separate arguments

                            safePrint.log(`[Contact ${newContactId}] Linked ${linkResult} tags.`);
                        }

                    } catch (tagError) {
                        safePrint.error(`[Contact ${newContactId}] Error processing tags:`, tagError);
                        // Throw to ensure atomicity - if tags fail, the contact insert will be rolled back.
                        throw new Error(`Failed to process tags for contact ${newContactId}: ${tagError instanceof Error ? tagError.message : tagError}`);
                    }
                }
                // --- END: Tag Processing Logic ---

              } else {
                 // This case (result === 0) shouldn't happen without ON CONFLICT, but log if it does
                 // Pass an actual Error object instead of null
                 const zeroRowsError = new Error("Insert query affected 0 rows unexpectedly.");
                 safePrint.error(`[Row ??? Email: ${contactData.email}] Insert query affected 0 rows unexpectedly.`, zeroRowsError);
                 // We might not easily know the original rowIndex here, log email instead
                 databaseErrorsInfo.push({
                     email: contactData.email,
                     message: 'Insert query affected 0 rows unexpectedly.',
                     error: zeroRowsError // Add the error object for consistency
                 });
              }
            } catch (insertError) {
              safePrint.error(`[Row ??? Email: ${contactData.email}] DB Error during insert:`, insertError);
              databaseErrorsInfo.push({ // Collect error info before throwing
                  email: contactData.email,
                  message: `Database error during insert: ${insertError instanceof Error ? insertError.message : 'Unknown DB error'}`,
                  error: insertError
              });
              throw insertError; // IMPORTANT: Re-throw to roll back the transaction
            }
          }
          return successfulInsertsInTx; // Return count from successful transaction
        });
        safePrint.log(`Transaction successful. ${actualSuccessCount} contacts inserted.`);
      } catch (transactionError) {
        // This catch block executes if any error was thrown inside the transaction
        // Pass the actual error object as the second argument
        safePrint.error('Transaction failed and rolled back:', transactionError);
        // actualSuccessCount remains 0 as the transaction failed
        // databaseErrorsInfo should contain the error that caused the rollback
        if (databaseErrorsInfo.length === 0) {
            // If no specific error was captured, add a generic one
             databaseErrorsInfo.push({
                 message: `Transaction failed: ${transactionError instanceof Error ? transactionError.message : 'Unknown transaction error'}`,
                 error: transactionError
             });
        }
      }
    } else {
      safePrint.log('No valid, non-duplicate contacts to import.');
    }

    // --- Construct Final Response ---
    const results = {
      success: databaseErrorsInfo.length === 0, // Overall success depends on DB errors now
      successCount: actualSuccessCount,
      validationErrorCount: failedValidationRowsInfo.length,
      duplicateSkipCount: skippedDuplicates.length,
      validationErrors: failedValidationRowsInfo.map(failedRow => ({
        row: failedRow.row,
        message: `Validation failed: ${failedRow.errors.map(e => e.message).join(', ')}`,
        errors: failedRow.errors,
        contact: failedRow.contact // Sanitized contact data
      })),
      skippedDuplicates: skippedDuplicates,
      databaseErrors: databaseErrorsInfo // Report collected DB errors
    };

    // Determine final status code
    // 200 OK: All processed rows were inserted successfully (no validation/duplicate/db errors)
    // 207 Multi-Status: Some rows inserted, but some failed validation or were duplicates (but no DB errors during insert)
    // 500 Internal Server Error: If any database error occurred during the transaction
    let finalStatus = 500; // Default to 500 if DB errors occurred
    if (databaseErrorsInfo.length === 0) {
        if (results.validationErrorCount === 0 && results.duplicateSkipCount === 0) {
            finalStatus = 200; // All good
        } else {
            finalStatus = 207; // Partial success (validation/duplicate skips only)
        }
    }

     safePrint.log('Bulk import process finished. Final results:', {
      successCount: results.successCount,
      validationErrorCount: results.validationErrorCount,
      duplicateSkipCount: results.duplicateSkipCount,
      databaseErrorCount: results.databaseErrors.length,
      status: finalStatus
    });

    return NextResponse.json(results, { status: finalStatus });

  } catch (error) {
    // Catch any unexpected errors outside the main processing/transaction logic
    console.error('!!! UNHANDLED Error in bulk contact creation API:', error);
    return NextResponse.json(
      {
        message: 'Internal server error occurred.',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        successCount: 0,
        validationErrorCount: 0, // Unknown at this point
        duplicateSkipCount: 0, // Unknown at this point
        validationErrors: [],
        skippedDuplicates: [],
        databaseErrors: [{ message: `Unhandled server error: ${error instanceof Error ? error.message : 'Unknown error'}` }]
      },
      { status: 500 } // Ensure 500 for unhandled errors
    );
  }
}
