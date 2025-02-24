import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logging';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location_id = searchParams.get('location_id');

    if (!location_id) {
      return NextResponse.json(
        { error: 'location_id is required' },
        { status: 400 }
      );
    }

    // Find the organization directly using location_id with raw query
    const organizations = await prisma.$queryRaw<any[]>`
      SELECT 
        o.id,
        o.name,
        o."webhookUrl",
        o."outboundWebhookUrl",
        o."billingPlan",
        o."creditBalance",
        (
          SELECT json_agg(json_build_object(
            'id', ea.id,
            'email', ea.email,
            'name', ea.name,
            'unipileAccountId', ea."unipileAccountId"
          ))
          FROM "EmailAccount" ea
          WHERE ea."organizationId" = o.id
          AND ea."isActive" = true
        ) as "emailAccounts",
        (
          SELECT json_agg(json_build_object(
            'id', sa.id,
            'username', sa.username,
            'name', sa.name,
            'provider', sa.provider
          ))
          FROM "SocialAccount" sa
          WHERE sa."organizationId" = o.id
          AND sa."isActive" = true
        ) as "socialAccounts",
        (
          SELECT json_agg(json_build_object(
            'name', p.name,
            'content', p.content
          ))
          FROM "Prompt" p
          WHERE p."organizationId" = o.id
        ) as prompts
      FROM "Organization" o
      WHERE o.location_id = ${location_id}
      LIMIT 1
    `;

    const organization = organizations?.[0];

    if (!organization) {
      log('error', 'Organization not found for location_id', { location_id });
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Ensure arrays are never null
    organization.emailAccounts = organization.emailAccounts || [];
    organization.socialAccounts = organization.socialAccounts || [];
    
    // Transform prompts array into key-value object
    const promptsArray = organization.prompts || [];
    organization.prompts = promptsArray.reduce((acc: Record<string, string>, prompt: any) => {
      if (prompt && prompt.name && prompt.content) {
        acc[prompt.name] = prompt.content;
      }
      return acc;
    }, {});

    log('info', 'Found organization by location_id', {
      location_id,
      organizationId: organization.id
    });

    return NextResponse.json(organization);

  } catch (error) {
    log('error', 'Error looking up organization:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: 'Failed to lookup organization' },
      { status: 500 }
    );
  }
} 