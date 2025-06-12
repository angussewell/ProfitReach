import { ConversationStatus } from '@prisma/client';

/**
 * Get the CSS color class for a conversation status badge
 */
export const getStatusColor = (status?: ConversationStatus | null): string => {
  switch (status) {
    case 'MEETING_BOOKED': return 'bg-green-100 text-green-800';
    case 'NOT_INTERESTED': return 'bg-red-100 text-red-800';
    case 'FOLLOW_UP_NEEDED': return 'bg-amber-100 text-amber-800'; 
    case 'NO_ACTION_NEEDED': return 'bg-gray-100 text-gray-800';
    case 'WAITING_FOR_REPLY': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get a human-readable label for a conversation status
 */
export const getStatusLabel = (status?: ConversationStatus | null): string => {
  switch (status) {
    case 'MEETING_BOOKED': return 'Meeting Booked';
    case 'NOT_INTERESTED': return 'Not Interested';
    case 'FOLLOW_UP_NEEDED': return 'Follow Up Needed';
    case 'NO_ACTION_NEEDED': return 'No Action Needed';
    case 'WAITING_FOR_REPLY': return 'Waiting for Reply';
    default: return 'Unknown Status';
  }
};

/**
 * Get background color for a conversation status row in a list view
 */
export const getStatusRowStyle = (status: ConversationStatus, date?: Date, isFromUs?: boolean): string => {
  switch (status) {
    case 'MEETING_BOOKED':
      return 'border-green-300 bg-green-50/30';
    case 'NOT_INTERESTED':
      return 'border-red-300 bg-red-50/30';
    case 'FOLLOW_UP_NEEDED':
      return 'border-red-300 bg-red-50/30';
    case 'NO_ACTION_NEEDED':
      return 'border-gray-300 bg-gray-50/30';
    case 'WAITING_FOR_REPLY':
      return 'border-blue-300 bg-blue-50/30';
    default:
      return '';
  }
};
