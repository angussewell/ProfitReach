import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Prisma, Prompt } from '@prisma/client';

// Get all prompts
export async function GET() {
  try {
    const prompts = await prisma.prompt.findMany();
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
    const data = await request.json();
    const { name, content } = data;

    const prompt = await prisma.prompt.create({
      data: {
        name,
        content
      }
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
    const data = await request.json();
    const { id, name, content } = data;

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