import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// TODO: Add authentication before production use
// This endpoint is temporarily open for n8n testing
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const name = searchParams.get('name');

    if (!organizationId || !name) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const scenario = await prisma.scenario.findFirst({
      where: {
        organizationId,
        name,
      },
      include: {
        attachment: true,
        snippet: true,
        signature: true
      }
    });

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error finding scenario:', error);
    return NextResponse.json(
      { error: 'Failed to find scenario' },
      { status: 500 }
    );
  }
} 