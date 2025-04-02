/**
 * Utility functions for handling dates
 */

/**
 * Format a date string in a user-friendly format.
 * 
 * @param dateStr - Date or ISO date string or any valid date string
 * @returns Formatted date string (e.g., "Mar 14, 2025 at 11:11 AM")
 */
import { format } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

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
 * 
 * @param dateTimeStr - Local date-time string in format 'YYYY-MM-DDTHH:MM:SS'
 * @param timeZone - IANA timezone string (e.g., 'America/Chicago')
 * @returns UTC ISO string
 */
export function convertToUTC(dateTimeStr: string, timeZone: string = 'America/Chicago'): string {
  try {
    // Parse the local date-time string
    const localDate = new Date(dateTimeStr);
    
    // Convert to a Date object in the specified timezone
    const utcDate = zonedTimeToUtc(localDate, timeZone);
    
    // Return as ISO string
    return utcDate.toISOString();
  } catch (error) {
    console.error('Error converting to UTC:', error);
    // If conversion fails, return the input as-is
    return dateTimeStr;
  }
}
