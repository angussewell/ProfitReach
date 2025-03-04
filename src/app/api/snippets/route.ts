import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const snippets = await prisma.snippet.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(snippets);
  } catch (error) {
    console.error('Error fetching snippets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snippets' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    
    if (!data.name || !data.content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      );
    }

    const snippet = await prisma.snippet.create({
      data: {
        name: data.name,
        content: data.content,
        organizationId: session.user.organizationId
      }
    });

    return NextResponse.json(snippet);
  } catch (error) {
    console.error('Error creating snippet:', error);
    return NextResponse.json(
      { error: 'Failed to create snippet' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    
    if (!data.id || !data.name || !data.content) {
      return NextResponse.json(
        { error: 'ID, name, and content are required' },
        { status: 400 }
      );
    }

    // First verify the snippet belongs to the organization
    const existingSnippet = await prisma.snippet.findFirst({
      where: {
        id: data.id,
        organizationId: session.user.organizationId
      }
    });

    if (!existingSnippet) {
      return NextResponse.json(
        { error: 'Snippet not found' },
        { status: 404 }
      );
    }

    const snippet = await prisma.snippet.update({
      where: { id: data.id },
      data: {
        name: data.name,
        content: data.content
      }
    });

    return NextResponse.json(snippet);
  } catch (error) {
    console.error('Error updating snippet:', error);
    return NextResponse.json(
      { error: 'Failed to update snippet' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Snippet ID is required' },
        { status: 400 }
      );
    }

    // First verify the snippet belongs to the organization
    const existingSnippet = await prisma.snippet.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId
      }
    });

    if (!existingSnippet) {
      return NextResponse.json(
        { error: 'Snippet not found' },
        { status: 404 }
      );
    }

    await prisma.snippet.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting snippet:', error);
    return NextResponse.json(
      { error: 'Failed to delete snippet' },
      { status: 500 }
    );
  }
} 