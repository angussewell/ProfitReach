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
  console.log(`--- Handling POST /api/prompts ---`);
  // Optional: Log key headers
  // console.log('Request Headers:', JSON.stringify(Object.fromEntries(request.headers), null, 2));
  try {
    const session = await getServerSession(authOptions);
    // Optional: Log session info
    // console.log('Session User ID:', session?.user?.id);
    // console.log('Session Org ID:', session?.user?.organizationId);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.clone().json(); // Clone request to read body again later
    console.log('Received Body for Prompt:', JSON.stringify(rawBody, null, 2));

    const data = rawBody; // Use the already parsed body
    const { name, content } = data;

    if (!name || !content) {
      console.error("!!! API Validation Error (Prompt): Missing 'name' or 'content'", { name: !!name, content: !!content });
      return NextResponse.json(
        { success: false, error: 'Invalid input: Name and content are required.' },
        { status: 400 }
      );
    }

    // Generate UUID and timestamps manually
    const id = randomUUID();
    const now = new Date();
    const organizationId = session.user.organizationId;

    const insertData = { id, name, content, organizationId, createdAt: now, updatedAt: now };
    console.log('Attempting prompt INSERT with data:', insertData);

    // Use raw SQL to insert the record with all required fields
    await prisma.$executeRaw`
      INSERT INTO "Prompt" (id, name, content, "organizationId", "createdAt", "updatedAt")
      VALUES (${insertData.id}, ${insertData.name}, ${insertData.content}, ${insertData.organizationId}, ${insertData.createdAt}, ${insertData.updatedAt})
    `;

    // Fetch the created prompt to return it
    const prompt = await prisma.prompt.findUnique({
      where: { id }
    });

    return NextResponse.json(prompt);
  } catch (error) {
    console.error("!!! API Error creating prompt:", error); // Log the complete error object
    return NextResponse.json(
      { success: false, error: 'Failed to create prompt.' },
      { status: 500 } // Return 500 for unexpected server errors
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
