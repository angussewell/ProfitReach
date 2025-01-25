import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface PropertyOption {
  label: string;
  value: string;
  description?: string;
}

interface Property {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  options: PropertyOption[];
}

export async function GET() {
  try {
    const scenarios = await prisma.scenario.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, description, type } = data;

    const scenario = await prisma.scenario.create({
      data: {
        name,
        description,
        type,
        status: 'active'
      }
    });

    // Update property options
    const newOption: PropertyOption = {
      label: name,
      value: name,
      description: description
    };

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 });
  }
} 