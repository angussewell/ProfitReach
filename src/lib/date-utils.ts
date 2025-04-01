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
