import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { CreateReportBuilderConfigRequest } from '@/types/report-builder';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use Prisma Client instead of raw SQL
    const configs = await prisma.reportBuilderConfig.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        notificationEmail: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching report builder configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report builder configurations' },
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

    const data: CreateReportBuilderConfigRequest = await req.json();
    
    if (!data.name || !data.webhookUrl || !data.notificationEmail) {
      return NextResponse.json(
        { error: 'Name, webhook URL, and notification email are required' },
        { status: 400 }
      );
    }

    // Basic webhook URL validation
    try {
      new URL(data.webhookUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL format' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.notificationEmail)) {
      return NextResponse.json(
        { error: 'Invalid notification email format' },
        { status: 400 }
      );
    }

    try {
      // Use Prisma Client to create the record
      const config = await prisma.reportBuilderConfig.create({
        data: {
          name: data.name,
          webhookUrl: data.webhookUrl,
          notificationEmail: data.notificationEmail,
          organizationId: session.user.organizationId,
          updatedAt: new Date(),
        },
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

      return NextResponse.json(config, { status: 201 });
    } catch (dbError) {
      console.error('Database error creating report builder config:', dbError);
      
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
        { error: 'Database error while creating configuration' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating report builder config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}