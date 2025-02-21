import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    // TODO: Add authentication
    console.log("Fetching organization data for:", params.organizationId);

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