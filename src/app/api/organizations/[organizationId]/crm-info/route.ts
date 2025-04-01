import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Helper function to check if user has access to organization
async function hasOrganizationAccess(sessionOrganizationId: string, requestedOrganizationId: string) {
  // Simple check if the organization IDs match
  return sessionOrganizationId === requestedOrganizationId;
}

// Helper function to escape string values for SQL to prevent injection
function escapeSqlString(value: string | null): string {
  if (value === null) return 'NULL';
  // Replace single quotes with double quotes for PostgreSQL
  return `'${value.replace(/'/g, "''")}'`;
}

export async function GET(
  request: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    console.log('GET request for CRM info starting...');
    const session = await getServerSession(authOptions);
    console.log('Session retrieved:', session ? 'Present' : 'Missing');
    
    if (!session?.user?.organizationId) {
      console.log('Debug - No organization ID in session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = params;
    console.log('Requested organization ID:', organizationId);
    
    // Check if user has access to this organization
    const hasAccess = await hasOrganizationAccess(session.user.organizationId, organizationId);
    console.log('User has access to organization:', hasAccess);
    
    if (!hasAccess) {
      console.log('Debug - User does not have access to organization');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch CRM info using raw SQL
    try {
      console.log('Fetching CRM info for organization:', organizationId);
      
      // No need to get table schema first
      const result = await prisma.$queryRaw`
        SELECT 
          "organizationId", 
          "private_integration_token", 
          "prospect_research", 
          "company_research", 
          "previous_message_copy", 
          "previous_message_subject_line", 
          "previous_message_id", 
          "thread_id", 
          "email_sender", 
          "original_outbound_rep_name", 
          "date_of_research", 
          "all_employees", 
          "provider_id", 
          "mutual_connections", 
          "additional_research", 
          "current_scenario", 
          "outbound_rep_name", 
          "lead_status", 
          "initial_linkedin_message_copy", 
          "linkedin_user_provider_id", 
          "title_field_id", 
          "linkedin_profile_photo_field_id", 
          "linkedin_posts_field_id",
          COALESCE("notification_emails", '[]'::jsonb) as "notification_emails"
        FROM "CrmInfo"
        WHERE "organizationId" = ${organizationId}::text
      `;
      console.log('SQL query executed successfully');
      console.log('CRM info fetch result type:', typeof result);
      console.log('CRM info fetch result is array:', Array.isArray(result));
      
      if (Array.isArray(result)) {
        console.log('CRM info fetch result length:', result.length);
        if (result.length > 0) {
          console.log('CRM info fetch result first item keys:', Object.keys(result[0]));
        } else {
          console.log('CRM info fetch returned empty array');
        }
      } else {
        console.log('CRM info fetch result is not an array, type:', typeof result);
      }

      // Handle case where result is an array
      const crmInfo = Array.isArray(result) ? result[0] : result;
      
      // Debug logging for crmInfo structure
      console.log('CrmInfo structure:', crmInfo ? 'Present' : 'Missing');
      
      // Create a safe version of crmInfo with default values for missing fields
      let safeCrmInfo = crmInfo;
      
      // If crmInfo is null or undefined, create a default empty object
      if (!safeCrmInfo) {
        console.log('Creating default empty CrmInfo object');
        safeCrmInfo = {
          organizationId: organizationId,
          notification_emails: [],
        };
      }
      
      // Debug logging for notification_emails
      try {
        console.log('CrmInfo notification_emails type:', typeof safeCrmInfo.notification_emails);
        console.log('CrmInfo notification_emails value:', safeCrmInfo.notification_emails);
        
        // Ensure notification_emails is processed properly
        if (safeCrmInfo.notification_emails === null || safeCrmInfo.notification_emails === undefined) {
          console.log('Setting null/undefined notification_emails to empty array');
          safeCrmInfo.notification_emails = [];
        }
      } catch (notificationError) {
        console.error('Error processing notification_emails:', notificationError);
        // Ensure we have a valid notification_emails field regardless of error
        safeCrmInfo.notification_emails = [];
      }

      return NextResponse.json(safeCrmInfo || null);
    } catch (sqlError) {
      console.error('SQL Error during fetch:', sqlError);
      console.error('SQL Error details:', sqlError instanceof Error ? sqlError.message : String(sqlError));
      console.error('SQL Error stack:', sqlError instanceof Error ? sqlError.stack : 'No stack trace');
      throw sqlError;
    }
  } catch (error) {
    console.error('Error in GET /api/organizations/[organizationId]/crm-info:', error);
    // Add more detailed error information to help debug
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = params;
    
    // Check if user has access to this organization
    const hasAccess = await hasOrganizationAccess(session.user.organizationId, organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    console.log('Processing update for organization:', organizationId);
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    // Step 1: Check if the record exists
    const checkResult = await prisma.$queryRaw`
      SELECT COUNT(*) FROM "CrmInfo" WHERE "organizationId" = ${organizationId}::text
    `;
    
    const recordExists = Array.isArray(checkResult) && checkResult.length > 0 && Number(checkResult[0].count) > 0;
    console.log('Record exists:', recordExists);
    
    // Step 2: Either update existing record or insert new one
    if (recordExists) {
      // Update existing record
      console.log('Updating existing record');
      await prisma.$executeRaw`
        UPDATE "CrmInfo" SET
          "private_integration_token" = ${body.private_integration_token || null}::text,
          "prospect_research" = ${body.prospect_research || null}::text,
          "company_research" = ${body.company_research || null}::text,
          "previous_message_copy" = ${body.previous_message_copy || null}::text,
          "previous_message_subject_line" = ${body.previous_message_subject_line || null}::text,
          "previous_message_id" = ${body.previous_message_id || null}::text,
          "thread_id" = ${body.thread_id || null}::text,
          "email_sender" = ${body.email_sender || null}::text,
          "original_outbound_rep_name" = ${body.original_outbound_rep_name || null}::text,
          "date_of_research" = ${body.date_of_research || null}::text,
          "all_employees" = ${body.all_employees || null}::text,
          "provider_id" = ${body.provider_id || null}::text,
          "mutual_connections" = ${body.mutual_connections || null}::text,
          "additional_research" = ${body.additional_research || null}::text,
          "current_scenario" = ${body.current_scenario || null}::text,
          "outbound_rep_name" = ${body.outbound_rep_name || null}::text,
          "lead_status" = ${body.lead_status || null}::text,
          "initial_linkedin_message_copy" = ${body.initial_linkedin_message_copy || null}::text,
          "linkedin_user_provider_id" = ${body.linkedin_user_provider_id || null}::text,
          "title_field_id" = ${body.title_field_id || null}::text,
          "linkedin_profile_photo_field_id" = ${body.linkedin_profile_photo_field_id || null}::text,
          "linkedin_posts_field_id" = ${body.linkedin_posts_field_id || null}::text,
          "notification_emails" = ${body.notification_emails ? JSON.stringify(body.notification_emails) : '[]'}::jsonb,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "organizationId" = ${organizationId}::text
      `;
    } else {
      // Generate a UUID for the id column
      const uuid = crypto.randomUUID();
      console.log('Generated UUID for new record:', uuid);
      
      // Use direct SQL with the UUID for the id column
      // Use our escape function to prevent SQL injection
      console.log('Inserting new record with explicit id (UUID)');
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO "CrmInfo" 
        ("id", "organizationId", "private_integration_token", "prospect_research", 
         "company_research", "previous_message_copy", "previous_message_subject_line", 
         "previous_message_id", "thread_id", "email_sender", "original_outbound_rep_name", 
         "date_of_research", "all_employees", "provider_id", "mutual_connections", 
         "additional_research", "current_scenario", "outbound_rep_name", "lead_status", 
         "initial_linkedin_message_copy", "linkedin_user_provider_id", "title_field_id",
         "linkedin_profile_photo_field_id", "linkedin_posts_field_id", "notification_emails", "updatedAt", "createdAt")
        VALUES 
        ('${uuid}', '${organizationId}', 
         ${escapeSqlString(body.private_integration_token)}, 
         ${escapeSqlString(body.prospect_research)}, 
         ${escapeSqlString(body.company_research)}, 
         ${escapeSqlString(body.previous_message_copy)}, 
         ${escapeSqlString(body.previous_message_subject_line)}, 
         ${escapeSqlString(body.previous_message_id)}, 
         ${escapeSqlString(body.thread_id)}, 
         ${escapeSqlString(body.email_sender)}, 
         ${escapeSqlString(body.original_outbound_rep_name)}, 
         ${escapeSqlString(body.date_of_research)}, 
         ${escapeSqlString(body.all_employees)}, 
         ${escapeSqlString(body.provider_id)}, 
         ${escapeSqlString(body.mutual_connections)}, 
         ${escapeSqlString(body.additional_research)}, 
         ${escapeSqlString(body.current_scenario)}, 
         ${escapeSqlString(body.outbound_rep_name)}, 
         ${escapeSqlString(body.lead_status)}, 
         ${escapeSqlString(body.initial_linkedin_message_copy)}, 
         ${escapeSqlString(body.linkedin_user_provider_id)},
         ${escapeSqlString(body.title_field_id)},
         ${escapeSqlString(body.linkedin_profile_photo_field_id)},
         ${escapeSqlString(body.linkedin_posts_field_id)}, 
         '${body.notification_emails ? JSON.stringify(body.notification_emails) : '[]'}',
         CURRENT_TIMESTAMP, 
         CURRENT_TIMESTAMP)
      `);
    }
    
    console.log('SQL operation successful');
    
    // Fetch the updated record
    const updatedResult = await prisma.$queryRaw`
      SELECT 
        "organizationId", 
        "private_integration_token", 
        "prospect_research", 
        "company_research", 
        "previous_message_copy", 
        "previous_message_subject_line", 
        "previous_message_id", 
        "thread_id", 
        "email_sender", 
        "original_outbound_rep_name", 
        "date_of_research", 
        "all_employees", 
        "provider_id", 
        "mutual_connections", 
        "additional_research", 
        "current_scenario", 
        "outbound_rep_name", 
        "lead_status", 
        "initial_linkedin_message_copy", 
        "linkedin_user_provider_id", 
        "title_field_id", 
        "linkedin_profile_photo_field_id", 
        "linkedin_posts_field_id",
        COALESCE("notification_emails", '[]'::jsonb) as "notification_emails"
      FROM "CrmInfo"
      WHERE "organizationId" = ${organizationId}::text
    `;

    const updatedCrmInfo = Array.isArray(updatedResult) ? updatedResult[0] : updatedResult;
    console.log('Updated CRM info fields:', Object.keys(updatedCrmInfo));

    return NextResponse.json(updatedCrmInfo);
  } catch (error) {
    console.error('Error in PUT /api/organizations/[organizationId]/crm-info:', error);
    // Add more detailed error information to help debug
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    // Log the request body to see what's being sent
    try {
      const body = await request.clone().json();
      console.error('Request body:', JSON.stringify(body, null, 2));
    } catch (e) {
      console.error('Could not log request body:', e);
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 