import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = params.organizationId;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Regular users can only access their own organization
    if (session.user.role !== 'admin' && session.user.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log("Fetching organization data for:", organizationId);

    const organization = await prisma.organization.findUnique({
      where: {
        id: params.organizationId,
      },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        outboundWebhookUrl: true,
        stripeCustomerId: true,
        billingPlan: true,
        creditBalance: true,
        createdAt: true,
        updatedAt: true,
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
      },
    });

    if (!organization) {
      console.error("Organization not found:", params.organizationId);
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    console.log("Successfully fetched organization data");
    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}
