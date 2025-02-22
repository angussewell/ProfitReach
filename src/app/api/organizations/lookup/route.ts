import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logging';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Find the organization through GHL integration
    const ghlIntegration = await prisma.gHLIntegration.findFirst({
      where: { locationId },
      select: {
        organization: {
          select: {
            id: true,
            name: true,
            webhookUrl: true,
            outboundWebhookUrl: true,
            billingPlan: true,
            creditBalance: true,
            emailAccounts: {
              where: { isActive: true },
              select: {
                id: true,
                email: true,
                name: true,
                unipileAccountId: true
              }
            },
            socialAccounts: {
              where: { isActive: true },
              select: {
                id: true,
                username: true,
                name: true,
                provider: true
              }
            },
            prompts: {
              select: {
                name: true,
                content: true
              }
            }
          }
        }
      }
    });

    if (!ghlIntegration?.organization) {
      log('error', 'Organization not found for location ID', { locationId });
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    log('info', 'Found organization by location ID', {
      locationId,
      organizationId: ghlIntegration.organization.id
    });

    return NextResponse.json(ghlIntegration.organization);

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