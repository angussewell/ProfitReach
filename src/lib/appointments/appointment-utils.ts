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
    
    // If the appointment has timezone info, make sure it's reflected in the date
    if (webhookData.appointmentDateTime && webhookData.timeZone) {
      try {
        // Format the date/time in the timezone-specific format
        console.log('Original appointment date/time:', webhookData.appointmentDateTime);
        
        // For debugging - log the time zone
        console.log('Appointment time zone:', webhookData.timeZone);
        
        // Don't modify the date format - just log what we're sending
        // This preserves the original date format which works with the database
      } catch (timeError) {
        console.error('Error formatting time for webhook:', timeError);
      }
    }
    
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