'use client';

import * as React from 'react';
// Import necessary hooks from React
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { formatDateInCentralTime } from '@/lib/date-utils';
import { Loader2, MessageSquare, ChevronDown } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
// Import helpers from the new utils file
import { isOurEmail, getLinkedInSenderName } from '@/lib/message-utils';
import { ConversationStatus, MessageSource } from '@prisma/client'; // Import enums directly

// Define necessary types locally (or import from a shared types file)
// Keep types consistent with message-utils and page component
interface FullEmailMessage {
  id: string;
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  recipientEmail: string;
  content: string;
  receivedAt: string; // API returns stringified date
  messageType: 'REAL_REPLY' | 'BOUNCE' | 'AUTO_REPLY' | 'OUT_OF_OFFICE' | 'OTHER';
  isRead: boolean;
  status?: ConversationStatus | null;
  messageSource?: MessageSource;
  socialAccountId?: string | null;
  organizationId?: string;
  classificationScores?: any | null;
  unipileEmailId?: string | null;
  emailAccountId?: string | null;
  aiSuggestion1?: string | null;
  aiSuggestion2?: string | null;
  aiSuggestion3?: string | null;
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

// MailReefRecipient interface for recipient dropdown
interface MailReefRecipient {
  recipientEmail: string;
  recipientType: string; // 'to', 'cc', 'bcc'
  contactId?: string | null;
}

// Props for the component
interface ConversationThreadViewProps {
  messages: FullEmailMessage[];
  emailAccounts: EmailAccount[];
  socialAccounts: SocialAccount[];
  className?: string;
}

// Helper functions are now imported from message-utils.ts

// Recipient Fetching Logic (remains here as it uses local state)
const useRecipientDetails = () => {
  const [recipientDetails, setRecipientDetails] = useState<Record<string, { loading: boolean; data: MailReefRecipient[] | null; error: string | null }>>({});

  const fetchRecipients = useCallback(async (internalMessageId: string, apiMessageId: string, organizationId: string | undefined) => {
    if (!organizationId) {
      console.error("Organization ID missing for fetching recipients");
      // Add type for prev
      setRecipientDetails((prev: Record<string, { loading: boolean; data: MailReefRecipient[] | null; error: string | null }>) => ({ ...prev, [internalMessageId]: { loading: false, data: null, error: 'Organization ID missing' } }));
      return;
    }
    // Add type for prev
    setRecipientDetails((prev: Record<string, { loading: boolean; data: MailReefRecipient[] | null; error: string | null }>) => ({ ...prev, [internalMessageId]: { loading: true, data: null, error: null } }));
    try {
      const response = await fetch(`/api/messages/recipients?messageId=${encodeURIComponent(apiMessageId)}&organizationId=${encodeURIComponent(organizationId)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error' }));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }
      const data: MailReefRecipient[] = await response.json();
      // Add type for prev
      setRecipientDetails((prev: Record<string, { loading: boolean; data: MailReefRecipient[] | null; error: string | null }>) => ({ ...prev, [internalMessageId]: { loading: false, data: data, error: null } }));
    } catch (error) {
      console.error('Error fetching recipients:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch recipients');
      // Add type for prev
      setRecipientDetails((prev: Record<string, { loading: boolean; data: MailReefRecipient[] | null; error: string | null }>) => ({ ...prev, [internalMessageId]: { loading: false, data: null, error: error instanceof Error ? error.message : 'Unknown error' } }));
    }
  }, []);

  return { recipientDetails, fetchRecipients };
};


export const ConversationThreadView: React.FC<ConversationThreadViewProps> = ({
  messages,
  emailAccounts,
  socialAccounts,
  className,
}) => {

  const { recipientDetails, fetchRecipients } = useRecipientDetails();
  const bottomRef = useRef<HTMLDivElement>(null); // Ref previously used for scrolling

  // Removed useEffect that scrolled to bottom on message change

  if (!messages || messages.length === 0) {
    return <p className="text-center text-slate-500 p-4">No messages in this thread.</p>;
  }

  // Sort messages chronologically (oldest first) - API should already do this, but double-check
  const sortedMessages = [...messages].sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

  return (
    <div className={cn("space-y-6", className)}>
      {sortedMessages.map((message, index) => {
        const isFromUs = isOurEmail(message.sender, message, emailAccounts, socialAccounts);
        const isLinkedIn = message.messageSource === 'LINKEDIN';

        return (
          <div
            key={message.id || index} // Use index as fallback key if id is missing
            className={cn(
              "py-5 px-6 rounded-lg",
              isFromUs ? "bg-blue-50/80 border border-blue-100/50" : "bg-white border border-slate-200/60"
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="min-w-0 max-w-[70%]">
                <p className="font-medium text-slate-900 flex items-center gap-1 truncate overflow-hidden text-ellipsis">
                  {/* LinkedInIcon removed, maybe add text indicator? */}
                  {isLinkedIn && <span className="text-xs font-normal text-blue-600 mr-1">(LI)</span>}
                  <span className="truncate">
                    {isLinkedIn
                      ? getLinkedInSenderName(message.sender, message, socialAccounts) // Use imported helper
                      : message.sender}
                  </span>
                   {isFromUs && <span className="text-xs text-blue-600 font-normal ml-1">(You)</span>}
                </p>
                {/* Recipient Info with Dropdown */}
                {!isLinkedIn && message.recipientEmail && (
                  <div className="flex items-center gap-0 mt-0.5">
                    <p className="text-xs text-slate-500 truncate overflow-hidden text-ellipsis shrink">
                      to {message.recipientEmail}
                    </p>
                    <DropdownMenu onOpenChange={(open) => {
                      if (open && !recipientDetails[message.id]?.data && !recipientDetails[message.id]?.loading) {
                        fetchRecipients(message.id, message.messageId, message.organizationId);
                      }
                    }}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0 ml-[-12px]">
                          <ChevronDown className="h-5 w-5" />
                          <span className="sr-only">Show all recipients</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64 max-h-60 overflow-y-auto">
                        {(() => {
                          const details = recipientDetails[message.id];
                          if (details) {
                            return (
                              <>
                                {details.loading && <DropdownMenuItem disabled className="flex justify-center items-center text-slate-500"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...</DropdownMenuItem>}
                                {details.error && <DropdownMenuItem disabled className="text-red-600 text-xs">Error: {details.error}</DropdownMenuItem>}
                                {details.data && details.data.length === 0 && <DropdownMenuItem disabled className="text-xs text-slate-500">No other recipients found.</DropdownMenuItem>}
                                {/* Add types for recipient and idx */}
                                {details.data && details.data.length > 0 && details.data.map((recipient: MailReefRecipient, idx: number) => (
                                  <DropdownMenuItem key={idx} className="text-xs p-1.5">
                                    <span className="font-medium w-8 inline-block mr-1 uppercase text-slate-500 flex-shrink-0">{recipient.recipientType}:</span>
                                    <span className="text-slate-700 truncate">{recipient.recipientEmail}</span>
                                  </DropdownMenuItem>
                                ))}
                              </>
                            );
                          } else {
                            return <DropdownMenuItem disabled className="text-xs text-slate-400">Click trigger to load...</DropdownMenuItem>;
                          }
                        })()}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                {isLinkedIn && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    via LinkedIn
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-sm text-slate-500">
                  {formatDateInCentralTime(message.receivedAt)}
                </div>
              </div>
            </div>

            <div className="mt-3 text-sm text-slate-800 whitespace-pre-wrap prose prose-sm max-w-none"
                 dangerouslySetInnerHTML={{ __html: message.content }} />
          </div>
        );
      })}
      {/* Div to ensure scrollIntoView works correctly */}
      <div ref={bottomRef} />
    </div>
  );
};
