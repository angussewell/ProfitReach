import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * The webhook URL for appointment notifications
 */
export const APPOINTMENT_WEBHOOK_URL = 'https://n8n.srv768302.hstgr.cloud/webhook/appointment';

/**
 * Safely fetch appointments including the new columns
 * This avoids Prisma's error when columns are added to the DB but not to the Prisma schema
 */
export async function fetchAppointments(organizationId: string, dateFilter?: { from?: Date, to?: Date }) {
  let dateFilterSql = Prisma.empty;
  
  if (dateFilter?.from && dateFilter?.to) {
    dateFilterSql = Prisma.sql`AND "createdAt" BETWEEN ${dateFilter.from}::timestamp(3) AND ${dateFilter.to}::timestamp(3)`;
  }

  try {
    const appointments = await prisma.$queryRaw`
      SELECT 
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
      FROM "Appointment"
      WHERE "organizationId" = ${organizationId}
      ${dateFilterSql}
      ORDER BY "appointmentDateTime" DESC
    `;
    
    return appointments;
  } catch (error) {
    console.error('Error in fetchAppointments:', error);
    // Fallback to only retrieving the original columns if the new columns are causing issues
    try {
      console.log('Attempting fallback query without new columns');
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
        WHERE "organizationId" = ${organizationId}
        ${dateFilterSql}
        ORDER BY "appointmentDateTime" DESC
      `;
      
      return appointments;
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * Send appointment data to the webhook
 */
export async function sendAppointmentWebhook(appointmentData: any) {
  try {
    console.log('Sending appointment webhook to:', APPOINTMENT_WEBHOOK_URL);
    
    // Create a copy of the appointment data to avoid modifying the original
    const webhookData = {...appointmentData};
    
    // CRITICAL FIX: Get the raw input time from metadata if available
    if (webhookData.meta?.rawDateTime) {
      console.log('Using raw appointment date/time for webhook:', webhookData.meta.rawDateTime);
      webhookData.appointmentDateTime = webhookData.meta.rawDateTime;
    } else if (webhookData.appointmentDateTime) {
      // Fallback logging
      console.log('Original ISO appointment date/time:', webhookData.appointmentDateTime);
    }
    
    // Send the webhook with the raw time
    const response = await fetch(APPOINTMENT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    const webhookResponse = await response.json().catch(() => ({}));
    console.log('Webhook response:', webhookResponse);
    
    return { success: true, response: webhookResponse };
  } catch (error) {
    console.error('Error sending appointment webhook:', error);
    return { success: false, error };
  }
} 