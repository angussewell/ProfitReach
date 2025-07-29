import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { UpdateReportBuilderConfigRequest } from '@/types/report-builder';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const data: UpdateReportBuilderConfigRequest = await req.json();
    
    // Validate at least one field is provided
    if (!data.name && !data.webhookUrl && !data.notificationEmail) {
      return NextResponse.json(
        { error: 'At least one field must be provided for update' },
        { status: 400 }
      );
    }

    // Validate webhook URL if provided
    if (data.webhookUrl) {
      try {
        new URL(data.webhookUrl);
      } catch {
        return NextResponse.json(
          { error: 'Invalid webhook URL format' },
          { status: 400 }
        );
      }
    }

    // Validate email if provided
    if (data.notificationEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.notificationEmail)) {
        return NextResponse.json(
          { error: 'Invalid notification email format' },
          { status: 400 }
        );
      }
    }

    try {
      // Build the update data object
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      
      if (data.webhookUrl !== undefined) {
        updateData.webhookUrl = data.webhookUrl;
      }
      
      if (data.notificationEmail !== undefined) {
        updateData.notificationEmail = data.notificationEmail;
      }

      // Use Prisma Client to update the record
      const updatedConfig = await prisma.reportBuilderConfig.update({
        where: {
          id: id,
          organizationId: session.user.organizationId, // Ensure ownership
        },
        data: updateData,
        select: {
          id: true,
          name: true,
          webhookUrl: true,
          notificationEmail: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json(updatedConfig);
    } catch (dbError) {
      console.error('Database error updating report builder config:', dbError);
      
      // Check for record not found (Prisma error)
      if (dbError instanceof Error && dbError.message.includes('Record to update not found')) {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        );
      }
      
      // Check for duplicate name error (Prisma error handling)
      if (dbError instanceof Error && (
        dbError.message.includes('unique constraint') || 
        dbError.message.includes('Unique constraint')
      )) {
        return NextResponse.json(
          { error: 'A configuration with this name already exists in your organization' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Database error while updating configuration' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating report builder config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    try {
      // Use Prisma Client to delete the record
      await prisma.reportBuilderConfig.delete({
        where: {
          id: id,
          organizationId: session.user.organizationId, // Ensure ownership
        },
      });

      return NextResponse.json({ success: true });
    } catch (dbError) {
      console.error('Database error deleting report builder config:', dbError);
      
      // Check for record not found (Prisma error)
      if (dbError instanceof Error && dbError.message.includes('Record to delete does not exist')) {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Database error while deleting configuration' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting report builder config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}