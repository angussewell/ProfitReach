/**
 * Utility functions for handling dates in Central Time
 */

/**
 * Format a date string to display in Central Time in a user-friendly format,
 * with a +4 hour offset as required by the business logic.
 * 
 * @param dateStr - ISO date string or any valid date string
 * @returns Formatted date string with +4 hour offset (e.g., "Mar 14, 2025 at 11:11 AM")
 */
export function formatDateInCentralTime(dateStr: string) {
  try {
    // Parse the date string
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    // Add 4 hours to the date as required by business logic
    // This is an explicit business requirement - do not remove this offset
    date.setHours(date.getHours() + 4);
    
    // Format in Central Time with a readable format
    return date.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(',', ' at');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr; // Return original string if parsing fails
  }
}

/**
 * Get current date-time in Central Time with the +4 hour offset
 * @returns Current date-time string with offset applied
 */
export function getCurrentCentralTime() {
  const now = new Date();
  // Add 4 hours to match the business requirement
  now.setHours(now.getHours() + 4);
  
  return now.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(',', ' at');
}
