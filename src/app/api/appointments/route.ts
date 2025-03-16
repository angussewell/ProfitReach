import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateFilter = from && to 
      ? Prisma.sql`AND "createdAt" BETWEEN ${new Date(from)}::timestamp(3) AND ${new Date(to)}::timestamp(3)`
      : Prisma.empty;

    const appointments = await prisma.$queryRaw`
      SELECT 
        "id"::text, 
        "organizationId", 
        "createdAt"::timestamp(3), 
        "notes", 
        "clientName", 
        "appointmentType", 
        "appointmentDateTime"::timestamp, 
        "status"
      FROM "Appointment"
      WHERE "organizationId" = ${session.user.organizationId}
      ${dateFilter}
      ORDER BY "appointmentDateTime" DESC
    `;

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { clientName, appointmentType, appointmentDateTime, notes } = body;

    const appointment = await prisma.$queryRaw`
      INSERT INTO "Appointment" (
        "organizationId", 
        "clientName", 
        "appointmentType", 
        "appointmentDateTime", 
        "notes",
        "status"
      ) 
      VALUES (
        ${session.user.organizationId},
        ${clientName},
        ${appointmentType},
        ${new Date(appointmentDateTime)}::timestamp,
        ${notes},
        'appointment_booked'::text
      )
      RETURNING 
        "id"::text, 
        "organizationId", 
        "createdAt"::timestamp(3), 
        "notes", 
        "clientName", 
        "appointmentType", 
        "appointmentDateTime"::timestamp, 
        "status"
    `;

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, clientName, appointmentType, appointmentDateTime, notes, status } = body;

    // Verify the appointment belongs to the organization
    const existingAppointment = await prisma.$queryRaw`
      SELECT "id"::text 
      FROM "Appointment"
      WHERE "id" = ${id}::uuid
      AND "organizationId" = ${session.user.organizationId}
    `;

    if (!existingAppointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Build the update query dynamically based on provided fields
    const updates = [];
    
    if (clientName) {
      updates.push(Prisma.sql`"clientName" = ${clientName}::text`);
    }
    if (appointmentType) {
      updates.push(Prisma.sql`"appointmentType" = ${appointmentType}::text`);
    }
    if (appointmentDateTime) {
      updates.push(Prisma.sql`"appointmentDateTime" = ${new Date(appointmentDateTime)}::timestamp`);
    }
    if (notes !== undefined) {
      updates.push(Prisma.sql`"notes" = ${notes}::text`);
    }
    if (status) {
      updates.push(Prisma.sql`"status" = ${status}::text`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updateQuery = Prisma.sql`
      UPDATE "Appointment"
      SET ${Prisma.join(updates)}
      WHERE "id" = ${id}::uuid
      AND "organizationId" = ${session.user.organizationId}
      RETURNING 
        "id"::text, 
        "organizationId", 
        "createdAt"::timestamp(3), 
        "notes", 
        "clientName", 
        "appointmentType", 
        "appointmentDateTime"::timestamp, 
        "status"
    `;

    const updatedAppointment = await prisma.$queryRaw(updateQuery);

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    // Delete the appointment only if it belongs to the organization
    const result = await prisma.$queryRaw`
      DELETE FROM "Appointment"
      WHERE "id" = ${id}::uuid
      AND "organizationId" = ${session.user.organizationId}
      RETURNING "id"::text
    `;

    if (!result) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}