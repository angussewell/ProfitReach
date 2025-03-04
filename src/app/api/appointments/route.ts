import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Prisma, PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/appointments - List appointments with date filtering
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get date range from query parameters
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Fetch appointments with date filter
    const appointments = await prisma.appointment.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(from && to ? {
          createdAt: {
            gte: new Date(from),
            lte: new Date(to),
          },
        } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST /api/appointments - Create a new appointment
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId || !session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { notes } = body;

    const appointment = await prisma.appointment.create({
      data: {
        organizationId: session.user.organizationId,
        createdBy: session.user.id,
        notes,
      },
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// DELETE /api/appointments/[id] - Delete an appointment
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const id = request.url.split('/').pop();
    if (!id) {
      return new NextResponse('Invalid appointment ID', { status: 400 });
    }

    // If 'latest' is passed, find and delete the most recent appointment
    if (id === 'latest') {
      const latestAppointment = await prisma.appointment.findFirst({
        where: {
          organizationId: session.user.organizationId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!latestAppointment) {
        return new NextResponse('No appointments found', { status: 404 });
      }

      await prisma.appointment.delete({
        where: {
          id: latestAppointment.id,
        },
      });

      return new NextResponse(null, { status: 204 });
    }

    // Otherwise, verify the specific appointment belongs to the organization
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!appointment) {
      return new NextResponse('Appointment not found', { status: 404 });
    }

    await prisma.appointment.delete({
      where: {
        id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 