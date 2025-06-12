import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { convertToUTC } from '@/lib/date-utils';

/**
 * The webhook URL for appointment notifications
 */
export const APPOINTMENT_WEBHOOK_URL = 'https://n8n-n8n.swl3bc.easypanel.host/webhook/appointment';

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
    console.log('Original appointment data:', JSON.stringify(appointmentData, null, 2));
    
    // Create a copy of the data to avoid modifying the original
    const webhookData = { ...appointmentData };
    
    // Force string format for appointmentDateTime if it's not already
    if (webhookData.appointmentDateTime && typeof webhookData.appointmentDateTime !== 'string') {
      webhookData.appointmentDateTime = webhookData.appointmentDateTime.toISOString ? 
        webhookData.appointmentDateTime.toISOString() : String(webhookData.appointmentDateTime);
    }
    
    // Make sure the appointmentDateTime is in the correct format (YYYY-MM-DDTHH:MM:SS)
    // If it's already an ISO string with Z, strip that off to get local time
    if (webhookData.appointmentDateTime && webhookData.appointmentDateTime.endsWith('Z')) {
      webhookData.appointmentDateTime = webhookData.appointmentDateTime.slice(0, -1);
    }
    
    // Debug the actual values we're working with
    console.log('Debug - appointmentDateTime format:', webhookData.appointmentDateTime);
    console.log('Debug - timeZone value:', webhookData.timeZone);
    
    // Convert the appointment datetime to UTC based on the specified timezone
    if (webhookData.appointmentDateTime) {
      // Store the original local time for reference
      webhookData.localAppointmentDateTime = webhookData.appointmentDateTime;
      webhookData.originalTimeZone = webhookData.timeZone || 'America/Chicago';
      
      // Convert to UTC ISO string - with or without explicit timezone, use what we have
      const beforeConversion = webhookData.appointmentDateTime;
      webhookData.appointmentDateTime = convertToUTC(
        webhookData.appointmentDateTime, 
        webhookData.timeZone || 'America/Chicago'
      );
      
      console.log(`Timezone conversion details:`);
      console.log(`- Original time: ${beforeConversion}`);
      console.log(`- Timezone: ${webhookData.originalTimeZone}`);
      console.log(`- Converted UTC time: ${webhookData.appointmentDateTime}`);
    } else {
      console.log('Missing required data for timezone conversion:');
      console.log(`- appointmentDateTime: ${webhookData.appointmentDateTime}`);
      console.log(`- timeZone: ${webhookData.timeZone}`);
    }
    
    console.log('Sending webhook payload:', JSON.stringify(webhookData, null, 2));
    
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
