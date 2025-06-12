import React from 'react'; // Import React for JSX component
import type { LucideProps } from 'lucide-react';
import { ConversationStatus, MessageSource } from '@prisma/client'; // Assuming enums are available via prisma client

// Define necessary types locally (or import from a shared types file)
// These should match the types used in the components that import these utils
interface EmailMessageBase { // Base interface for common fields
  id: string;
  sender: string;
  messageSource?: MessageSource | null;
  status?: ConversationStatus | null;
  receivedAt: string | Date; // Allow both string and Date
}

interface EmailAccount {
  id: string;
  email: string;
  name: string;
  isHidden?: boolean;
}

interface SocialAccount {
  id: string;
  name: string;
  username: string;
  provider: string;
  unipileAccountId: string;
  isActive: boolean;
  emailAccountId?: string;
}

// Helper function to check if a message is from us
export const isOurEmail = (sender: string, message: EmailMessageBase | null, emailAccounts: EmailAccount[], socialAccounts: SocialAccount[]): boolean => {
  if (!message) return false;
  if (message.messageSource === 'LINKEDIN') {
    // Check if the sender matches any active social account name for LinkedIn
    return socialAccounts.some(account => account.isActive && account.provider === 'LINKEDIN' && account.name === sender);
  }
  // Check if the sender matches any non-hidden email account
  return emailAccounts.some(account => !account.isHidden && account.email === sender);
};

// Helper function to get LinkedIn sender name
export const getLinkedInSenderName = (senderId: string, message: EmailMessageBase, socialAccounts: SocialAccount[]): string => {
  // Assuming message.sender holds the correct display name
  return message.sender;
};

// Helper function to get status color for the badge
export const getStatusColor = (status?: ConversationStatus | null): string => {
  switch (status) {
    case 'MEETING_BOOKED': return 'bg-green-100 text-green-800';
    case 'NOT_INTERESTED': return 'bg-red-100 text-red-800';
    case 'FOLLOW_UP_NEEDED': return 'bg-amber-100 text-amber-800'; // Keep amber for visibility
    case 'NO_ACTION_NEEDED': return 'bg-gray-100 text-gray-800';
    case 'WAITING_FOR_REPLY': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Helper function to get a human-readable status label
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

// Note: LinkedInIcon component removed due to parsing issues. Will need to be handled differently.
// Note: formatDateInCentralTime is already in '@/lib/date-utils', so no need to move it here.
// Note: useRecipientDetails hook remains in ConversationThreadView as it uses component state.
