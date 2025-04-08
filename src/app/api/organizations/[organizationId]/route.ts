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

    // Execute a simple query without relations first, 
    // then manually fetch relationships to avoid TypeScript errors
    const organization = await prisma.organization.findUnique({
      where: {
        id: params.organizationId,
      }
    });

    if (!organization) {
      console.error("Organization not found:", params.organizationId);
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Separately fetch related email accounts
    const emailAccounts = await prisma.emailAccount.findMany({
      where: {
        organizationId: params.organizationId,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        unipileAccountId: true
      }
    });

    // Separately fetch related social accounts
    const socialAccounts = await prisma.socialAccount.findMany({
      where: {
        organizationId: params.organizationId,
        isActive: true
      },
      select: {
        id: true,
        username: true,
        name: true,
        provider: true
      }
    });

    // Separately fetch related prompts
    const prompts = await prisma.prompt.findMany({
      where: {
        organizationId: params.organizationId
      },
      select: {
        name: true,
        content: true
      }
    });

    // Combine all data
    const result = {
      ...organization,
      emailAccounts,
      socialAccounts,
      prompts
    };

    console.log("Successfully fetched organization data");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}
