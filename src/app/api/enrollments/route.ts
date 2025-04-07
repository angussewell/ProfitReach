import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { FilterState } from '@/types/filters';
import { buildCombinedWhereClause, createApiResponse } from '@/lib/filters';

// Define the expected request body structure
interface EnrollmentRequestBody {
  workflowId: string;
  contactIds?: string[];
  isSelectAllMatchingActive?: boolean;
  filters?: FilterState;
  searchTerm?: string;
}

// Constants
const MAX_BULK_LIMIT = 1000; // Maximum number of contacts to enroll at once
// Whitelist of allowed webhook URL domains/prefixes for security
const ALLOWED_WEBHOOK_DOMAINS = [
  'https://n8n.yourdomain.com', // Example - replace with actual allowed domains
  'https://workflows.yourdomain.com',
  'http://localhost', // For local development
];

/**
 * Validates that a webhook URL is pointing to a trusted domain
 * @param url The webhook URL to validate
 * @returns true if the URL is trusted, false otherwise
 */
function isValidWebhookUrl(url: string): boolean {
  try {
    // First check if it's a valid URL
    new URL(url);
    
    // Then check if it starts with one of our allowed domains
    return ALLOWED_WEBHOOK_DOMAINS.some(domain => url.startsWith(domain));
  } catch (e) {
    // Invalid URL format
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      const { response, status } = createApiResponse(false, undefined, 'Unauthorized', 401);
      return NextResponse.json(response, { status });
    }
    const organizationId = session.user.organizationId;

    const body: EnrollmentRequestBody = await request.json();
    const { workflowId, contactIds, isSelectAllMatchingActive, filters, searchTerm } = body;

    if (!workflowId) {
      const { response, status } = createApiResponse(false, undefined, 'workflowId is required', 400);
      return NextResponse.json(response, { status });
    }

    // Validate batch size for direct contact IDs
    if (contactIds && contactIds.length > MAX_BULK_LIMIT) {
      const { response, status } = createApiResponse(
        false, 
        undefined, 
        `Batch size exceeds limit. Maximum ${MAX_BULK_LIMIT} contacts can be enrolled at once.`,
        400
      );
      return NextResponse.json(response, { status });
    }

    let targetContactIds: string[] = [];

    if (contactIds && contactIds.length > 0) {
      // Use provided contact IDs directly but verify they belong to the organization
      const existingContacts = await prisma.contacts.findMany({
        where: {
          id: { in: contactIds },
          organizationId
        },
        select: { id: true }
      });
      
      targetContactIds = existingContacts.map(contact => contact.id);
      
      if (targetContactIds.length === 0) {
        const { response, status } = createApiResponse(false, undefined, 'No valid contacts found for enrollment', 404);
        return NextResponse.json(response, { status });
      }

    } else if (isSelectAllMatchingActive && filters) {
      // Build combined where clause using shared utility
      const combinedWhere = buildCombinedWhereClause(organizationId, filters, searchTerm);

      // Check total count first to enforce limit
      const totalCount = await prisma.contacts.count({
        where: combinedWhere
      });
      
      if (totalCount > MAX_BULK_LIMIT) {
        const { response, status } = createApiResponse(
          false, 
          undefined, 
          `Too many contacts match the criteria (${totalCount}). Maximum ${MAX_BULK_LIMIT} contacts can be enrolled at once.`,
          400
        );
        return NextResponse.json(response, { status });
      }
      
      if (totalCount === 0) {
        const { response, status } = createApiResponse(false, undefined, 'No contacts found matching the criteria for enrollment', 404);
        return NextResponse.json(response, { status });
      }

      // Fetch only the IDs of the matching contacts
      const matchingContacts = await prisma.contacts.findMany({
        where: combinedWhere,
        select: {
          id: true,
        },
      });

      targetContactIds = matchingContacts.map(contact => contact.id);

    } else {
      const { response, status } = createApiResponse(false, undefined, 'No contacts selected for enrollment', 400);
      return NextResponse.json(response, { status });
    }

    // --- Webhook URL Validation (Critical Security Fix) ---
    const webhookUrl = process.env.N8N_ENROLLMENT_WEBHOOK_URL;
    if (!webhookUrl) {
      const { response, status } = createApiResponse(false, undefined, 'Enrollment endpoint configuration error: Missing webhook URL', 500);
      return NextResponse.json(response, { status });
    }
    
    // Validate webhook URL points to trusted domain
    if (!isValidWebhookUrl(webhookUrl)) {
    // Security warning - but don't expose details in the response
    // Log removed for production
    const { response, status } = createApiResponse(false, undefined, 'Enrollment endpoint configuration error: Invalid webhook URL', 500);
    return NextResponse.json(response, { status });
    }

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organizationId,
          workflowId: workflowId,
          contactIds: targetContactIds,
        }),
      });

      if (!webhookResponse.ok) {
        const errorBody = await webhookResponse.text();
        const { response, status } = createApiResponse(
          false, 
          undefined, 
          `Webhook call failed: ${webhookResponse.statusText}`,
          webhookResponse.status
        );
        return NextResponse.json(response, { status });
      }

      // Return standardized success response
      const { response } = createApiResponse(true, { enrolledCount: targetContactIds.length });
      return NextResponse.json(response);

    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
      const { response, status } = createApiResponse(
        false, 
        undefined, 
        `Failed to call enrollment webhook: ${errorMessage}`,
        500
      );
      return NextResponse.json(response, { status });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    const { response, status } = createApiResponse(false, undefined, `Internal Server Error: ${errorMessage}`, 500);
    return NextResponse.json(response, { status });
  }
}
