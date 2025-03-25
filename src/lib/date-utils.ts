/**
 * Utility functions for handling dates
 */

/**
 * Format a date string in a user-friendly format with a +5 hour offset.
 * 
 * @param dateStr - Date or ISO date string or any valid date string
 * @returns Formatted date string (e.g., "Mar 14, 2025 at 11:11 AM")
 */
import { format, addHours } from 'date-fns';

export function formatDateInCentralTime(dateStr: string | Date | null): string {
  if (!dateStr) return '';
  try {
    // Parse the input date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return ''; // Invalid date
    
    // Add 5 hours to match the expected display time
    const adjustedDate = addHours(date, 5);
    
    // Format the date
    return format(adjustedDate, "MMM d, yyyy 'at' h:mm a");
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Get current date-time with a +5 hour offset
 * @returns Current date-time string
 */
export function getCurrentCentralTime(): string {
  try {
    // Get the current time
    const now = new Date();
    
    // Add 5 hours to match the expected display time
    const adjustedDate = addHours(now, 5);
    
    // Format the date
    return format(adjustedDate, "MMM d, yyyy 'at' h:mm a");
  } catch (error) {
    console.error('Error getting current time:', error);
    return '';
  }
}
