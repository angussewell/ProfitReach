import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { addRequiredModelFields } from '@/lib/model-utils';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attachments = await prisma.attachment.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
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

    // Log the raw incoming request body for debugging
    const rawBody = await req.clone().json(); // Clone request to read body again later
    console.log('--- RAW INCOMING BODY /api/attachments ---:', JSON.stringify(rawBody, null, 2));

    const data = rawBody; // Use the already parsed body
    
    if (!data.name || !data.content) {
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
      INSERT INTO "Attachment" (id, name, content, "organizationId", "createdAt", "updatedAt")
      VALUES (${id}, ${data.name}, ${data.content}, ${organizationId}, ${now}, ${now})
    `;

    // Fetch the created attachment to return it
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.error('Error creating attachment:', error);
    return NextResponse.json(
      { error: 'Failed to create attachment' },
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

    // First verify the attachment belongs to the organization
    const existingAttachment = await prisma.attachment.findFirst({
      where: {
        id: data.id,
        organizationId: session.user.organizationId
      }
    });

    if (!existingAttachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    const attachment = await prisma.attachment.update({
      where: { id: data.id },
      data: {
        name: data.name,
        content: data.content
      }
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.error('Error updating attachment:', error);
    return NextResponse.json(
      { error: 'Failed to update attachment' },
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
        { error: 'Attachment ID is required' },
        { status: 400 }
      );
    }

    // First verify the attachment belongs to the organization
    const existingAttachment = await prisma.attachment.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId
      }
    });

    if (!existingAttachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    await prisma.attachment.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}
