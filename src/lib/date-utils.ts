/**
 * Utility functions for handling dates
 */

/**
 * Format a date string in a user-friendly format.
 * 
 * @param dateStr - Date or ISO date string or any valid date string
 * @returns Formatted date string (e.g., "Mar 14, 2025 at 11:11 AM")
 */
import { format, parseISO } from 'date-fns';

export function formatDateInCentralTime(dateStr: string | Date | null): string {
  if (!dateStr) return '';
  try {
    // Parse the input date - we just need to format it without timezone adjustments
    // This preserves the exact time that was entered
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return ''; // Invalid date
    
    // Format the date - no offset needed
    return format(date, "MMM d, yyyy 'at' h:mm a");
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Get current date-time
 * @returns Current date-time string
 */
export function getCurrentCentralTime(): string {
  try {
    // Get the current time
    const now = new Date();
    
    // Format the date - no offset needed
    return format(now, "MMM d, yyyy 'at' h:mm a");
  } catch (error) {
    console.error('Error getting current time:', error);
    return '';
  }
}

/**
 * Convert a local time string and timezone to UTC
 * This function properly converts a time in a specific timezone to UTC
 * 
 * @param dateTimeStr - Local date-time string in format 'YYYY-MM-DDTHH:MM:SS'
 * @param timeZone - IANA timezone string (e.g., 'America/Chicago')
 * @returns UTC ISO string
 */
export function convertToUTC(dateTimeStr: string, timeZone: string = 'America/Chicago'): string {
  try {
    // Get the timezone offset for the specified timezone
    // These are standard offsets from UTC in hours, positive for west of UTC
    const timezoneOffsets: Record<string, string> = {
      'America/New_York': '-04:00', // EDT
      'America/Chicago': '-05:00',  // CDT
      'America/Denver': '-06:00',   // MDT
      'America/Los_Angeles': '-07:00', // PDT
      'America/Anchorage': '-08:00', // AKDT
      'Pacific/Honolulu': '-10:00'  // HST
    };
    
    // Get the offset string for the timezone
    const offsetString = timezoneOffsets[timeZone] || '-05:00';
    
    // Ensure the dateTimeStr doesn't already have a timezone
    const cleanDateTimeStr = dateTimeStr.endsWith('Z') ? 
      dateTimeStr.slice(0, -1) : 
      dateTimeStr;
    
    // Create an ISO 8601 string with the timezone offset
    const isoWithOffset = `${cleanDateTimeStr}${offsetString}`;
    
    // Parse this to a Date object and convert to UTC
    const utcDate = new Date(isoWithOffset);
    
    // Return as ISO string
    return utcDate.toISOString();
  } catch (error) {
    console.error('Error converting to UTC:', error);
    // If conversion fails, return the input as-is
    return dateTimeStr;
  }
}
