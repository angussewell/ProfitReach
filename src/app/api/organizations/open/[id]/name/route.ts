import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: { name: true }
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ name: organization.name });
  } catch (error) {
    console.error('Error fetching organization name:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization name' },
      { status: 500 }
    );
  }
} 