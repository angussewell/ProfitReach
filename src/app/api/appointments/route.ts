import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { validateAuth } from '@/lib/auth/session';
import { 
  fetchAppointments, 
  sendAppointmentWebhook as sendWebhook, 
  APPOINTMENT_WEBHOOK_URL 
} from '@/lib/appointments/appointment-utils';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await validateAuth();
    if (error) {
      return error;
    }

    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Use the utility function to safely fetch appointments
    const appointments = await fetchAppointments(
      session.user.organizationId,
      from && to ? { 
        from: new Date(from), 
        to: new Date(to) 
      } : undefined
    );

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      clientName, 
      appointmentType, 
      appointmentDateTime, 
      notes, 
      status, 
      timeZone, 
      fromEmail,
      recipients 
    } = body;

    const appointment = await prisma.$queryRaw`
      INSERT INTO "Appointment" (
        "organizationId", 
        "clientName", 
        "appointmentType", 
        "appointmentDateTime", 
        "notes",
        "status",
        "timeZone",
        "fromEmail",
        "recipients"
      ) 
      VALUES (
        ${session.user.organizationId},
        ${clientName},
        ${appointmentType},
        ${appointmentDateTime}::timestamp,
        ${notes},
        ${status || 'appointment_booked'}::text,
        ${timeZone}::text,
        ${fromEmail}::text,
        ${recipients ? JSON.stringify(recipients) : null}::jsonb
      )
      RETURNING 
        "id"::text, 
        "organizationId", 
        "createdAt"::timestamp(3), 
        "notes", 
        "clientName", 
        "appointmentType", 
        "appointmentDateTime"::timestamp, 
        "status",
        "timeZone",
        "fromEmail",
        "recipients"
    `;

    // The appointment data to return in the response
    const appointmentData = Array.isArray(appointment) ? appointment[0] : appointment;

    // Send the webhook in the background
    // We don't await this to avoid blocking the API response
    sendWebhook({
      ...appointmentData,
      organizationId: session.user.organizationId,
      // Include any additional metadata that might be useful
      meta: {
        createdBy: session.user.email,
        userAgent: req.headers.get('user-agent'),
        source: 'ProfitReach',
        eventType: 'appointment_created'
      }
    });

    return NextResponse.json(appointmentData);
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      id, 
      clientName, 
      appointmentType, 
      appointmentDateTime, 
      notes, 
      status,
      timeZone,
      fromEmail,
      recipients
    } = body;

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
      updates.push(Prisma.sql`"appointmentDateTime" = ${appointmentDateTime}::timestamp`);
    }
    if (notes !== undefined) {
      updates.push(Prisma.sql`"notes" = ${notes}::text`);
    }
    if (status) {
      updates.push(Prisma.sql`"status" = ${status}::text`);
    }
    if (timeZone) {
      updates.push(Prisma.sql`"timeZone" = ${timeZone}::text`);
    }
    if (fromEmail) {
      updates.push(Prisma.sql`"fromEmail" = ${fromEmail}::text`);
    }
    if (recipients !== undefined) {
      updates.push(Prisma.sql`"recipients" = ${recipients ? JSON.stringify(recipients) : null}::jsonb`);
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
        "status",
        "timeZone",
        "fromEmail",
        "recipients"
    `;

    const updatedAppointment = await prisma.$queryRaw(updateQuery);

    // Send webhook notification for updates too
    const appointmentData = Array.isArray(updatedAppointment) ? updatedAppointment[0] : updatedAppointment;
    sendWebhook({
      ...appointmentData,
      organizationId: session.user.organizationId,
      // Include additional metadata for update events
      meta: {
        updatedBy: session.user.email,
        userAgent: req.headers.get('user-agent'),
        source: 'ProfitReach',
        eventType: 'appointment_updated'
      }
    });

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    // Get the appointment data before deleting it
    const appointmentToDelete = await prisma.$queryRaw`
      SELECT 
        "id"::text, 
        "clientName",
        "appointmentType",
        "status"
      FROM "Appointment"
      WHERE "id" = ${id}::uuid
      AND "organizationId" = ${session.user.organizationId}
    `;

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

    // Send webhook notification for deletion
    if (appointmentToDelete && Array.isArray(appointmentToDelete) && appointmentToDelete.length > 0) {
      sendWebhook({
        ...appointmentToDelete[0],
        organizationId: session.user.organizationId,
        // Include additional metadata for delete events
        meta: {
          deletedBy: session.user.email,
          userAgent: req.headers.get('user-agent'),
          source: 'ProfitReach',
          eventType: 'appointment_deleted'
        }
      });
    }

    return NextResponse.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}