import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma, Prompt } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { addRequiredModelFields } from '@/lib/model-utils';
import { randomUUID } from 'crypto';

// Get all prompts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prompts = await prisma.prompt.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

// Create a new prompt
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log the raw incoming request body for debugging
    const rawBody = await request.clone().json(); // Clone request to read body again later
    console.log('--- RAW INCOMING BODY /api/prompts ---:', JSON.stringify(rawBody, null, 2));

    const data = rawBody; // Use the already parsed body
    const { name, content } = data;

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      );
    }

    // Generate UUID and timestamps manually
    const id = randomUUID();
    const now = new Date();
    const organizationId = session.user.organizationId;

    // Use raw SQL to insert the record with all required fields
    await prisma.$executeRaw`
      INSERT INTO "Prompt" (id, name, content, "organizationId", "createdAt", "updatedAt")
      VALUES (${id}, ${name}, ${content}, ${organizationId}, ${now}, ${now})
    `;

    // Fetch the created prompt to return it
    const prompt = await prisma.prompt.findUnique({
      where: { id }
    });

    return NextResponse.json(prompt);
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}

// Update a prompt
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { id, name, content } = data;

    // First verify the prompt belongs to the organization
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId
      }
    });

    if (!existingPrompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    const prompt = await prisma.prompt.update({
      where: { id },
      data: {
        name,
        content
      }
    });

    return NextResponse.json(prompt);
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
}
