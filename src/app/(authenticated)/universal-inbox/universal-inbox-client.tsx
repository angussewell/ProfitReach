'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { ClientCard, ClientButton, ClientInput } from '@/components/ui/client-components';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button'; // Import Button
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'; // Import Dropdown components
import { Inbox, Loader2, MessageSquare, Reply, Send, Trash2, X, Calendar, ThumbsDown, Clock, CheckCircle, RefreshCw, Sparkles, XCircle, ChevronLeft, ChevronRight, Search, ChevronDown } from 'lucide-react'; // Import ChevronDown
import { cn } from '@/lib/utils';
import type { LucideProps } from 'lucide-react';
import { toast } from 'sonner';
import { updateMessageStatus } from '@/lib/server-actions';
import { formatDateInCentralTime } from '@/lib/date-utils';
import { getSession } from 'next-auth/react';
// Import shared helpers (Removed LinkedInIcon import)
import { isOurEmail, getLinkedInSenderName, getStatusColor, getStatusLabel } from '@/lib/message-utils';
import { ConversationStatus, MessageSource } from '@prisma/client'; // Import enums

// Define types locally (or import if available)
type MessageType = 'REAL_REPLY' | 'BOUNCE' | 'AUTO_REPLY' | 'OUT_OF_OFFICE' | 'OTHER';
// ConversationStatus and MessageSource are imported from @prisma/client

interface EmailMessage {
  id: string;
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  recipientEmail: string;
  content: string;
  receivedAt: string;
  messageType: MessageType;
  isRead: boolean;
  status?: ConversationStatus;
  messageSource?: MessageSource;
  socialAccountId?: string;
  organizationId?: string;
  classificationScores?: string[];
  unipileEmailId?: string;
  emailAccountId?: string;
  aiSuggestion1?: string;
  aiSuggestion2?: string;
  aiSuggestion3?: string;
}

// Define email account interface
interface EmailAccount {
  id: string;
  email: string;
  name: string;
  isHidden?: boolean;
}

// Add just after the EmailAccount interface, around line 37
interface SocialAccount {
  id: string;
  name: string;
  username: string;
  provider: string;
  unipileAccountId: string;
  isActive: boolean;
}

// Add MailReefRecipient interface (Phase 2, Step 1)
interface MailReefRecipient {
  recipientEmail: string;
  recipientType: string; // 'to', 'cc', 'bcc'
  contactId?: string | null;
}

const LoaderIcon: React.FC<LucideProps> = Loader2;
const InboxIcon: React.FC<LucideProps> = Inbox;
const MessageIcon: React.FC<LucideProps> = MessageSquare;
const ReplyIcon: React.FC<LucideProps> = Reply;
const SendIcon: React.FC<LucideProps> = Send;
const CloseIcon: React.FC<LucideProps> = X;
const TrashIcon: React.FC<LucideProps> = Trash2;
const CalendarIcon: React.FC<LucideProps> = Calendar;
const ThumbsDownIcon: React.FC<LucideProps> = ThumbsDown;
const ClockIcon: React.FC<LucideProps> = Clock;
const CheckCircleIcon: React.FC<LucideProps> = CheckCircle;

// Helper function to calculate days since a date
const daysSince = (date: Date): number => {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// Helper function to get status background color for the entire row
// Keep this local as it's specific to the row styling here
const getStatusRowStyle = (status: ConversationStatus, date?: Date, isFromUs?: boolean): string => {
  switch (status) {
    case 'MEETING_BOOKED':
      return 'border-green-300 bg-green-50/30';
    case 'NOT_INTERESTED':
      return 'border-red-300 bg-red-50/30';
    case 'FOLLOW_UP_NEEDED':
      return 'border-red-300 bg-red-50/30'; // Keep red for consistency? Or use amber like queue? Using red for now.
    case 'NO_ACTION_NEEDED':
      return 'border-gray-300 bg-gray-50/30';
    case 'WAITING_FOR_REPLY':
      return 'border-blue-300 bg-blue-50/30';
    default:
      return '';
  }
};

// getStatusColor, getStatusLabel, getLinkedInSenderName are now imported from message-utils
// LinkedInIcon was removed from utils

// Helper for displaying message icons based on source
const getMessageIcon = (message: EmailMessage) => {
  if (message.messageSource === 'LINKEDIN') {
    // Replace LinkedInIcon with text or another icon
    return <span className="text-blue-600 font-bold text-xs mr-1">(LI)</span>; // Placeholder text
  }
  return <MessageIcon className="h-5 w-5 text-slate-500" />;
};

// Helper function to determine if a thread is a LinkedIn thread
const isLinkedInThread = (messages: EmailMessage[]): boolean => {
  return messages.some(msg => msg.messageSource === 'LINKEDIN');
};

// formatStoredDate alias removed, use formatDateInCentralTime directly

export function UniversalInboxClient() {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<EmailMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [selectedFromEmail, setSelectedFromEmail] = useState<string>('');
  const [selectedSocialAccount, setSelectedSocialAccount] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  // Add a ref to track if the user has manually selected an email
  const userSelectedEmailRef = useRef<boolean>(false);
  // Add a new state for managing the AI suggestions request
  const [gettingSuggestions, setGettingSuggestions] = useState(false);
  const [suggestionStatus, setSuggestionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  // Add state for user's optional suggestion input
  const [userSuggestionInput, setUserSuggestionInput] = useState('');
  // Add a new state for status filtering
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'ALL'>('ALL');
  // Add state to manage thread selection after refresh
  const [pendingThreadSelection, setPendingThreadSelection] = useState<string | null>(null);

  // Add a ref for the reply card
  const replyCardRef = useRef<HTMLDivElement>(null);
  // Add ref for textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Add state for recipient details (Phase 2, Step 2)
  const [recipientDetails, setRecipientDetails] = useState<Record<string, { loading: boolean; data: MailReefRecipient[] | null; error: string | null }>>({});

  // Add fetch function for recipients (Phase 2, Step 3)
  const fetchRecipients = async (internalMessageId: string, apiMessageId: string, organizationId: string | undefined) => {
    if (!organizationId) {
      console.error("Organization ID missing for fetching recipients");
      setRecipientDetails(prev => ({
        ...prev,
        [internalMessageId]: { loading: false, data: null, error: 'Organization ID missing' }
      }));
      return;
    }

    setRecipientDetails(prev => ({
      ...prev,
      [internalMessageId]: { loading: true, data: null, error: null }
    }));

    try {
      const response = await fetch(`/api/messages/recipients?messageId=${encodeURIComponent(apiMessageId)}&organizationId=${encodeURIComponent(organizationId)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error' }));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }
      const data: MailReefRecipient[] = await response.json();
      setRecipientDetails(prev => ({
        ...prev,
        [internalMessageId]: { loading: false, data: data, error: null }
      }));
    } catch (error) {
      console.error('Error fetching recipients:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch recipients');
      setRecipientDetails(prev => ({
        ...prev,
        [internalMessageId]: { loading: false, data: null, error: error instanceof Error ? error.message : 'Unknown error' }
      }));
    }
  };

  // Memoize enhancedThreadGroups to stabilize its identity
  const enhancedThreadGroups = useMemo(() => {
    console.log("Recalculating enhancedThreadGroups..."); // Debug log
    const threadGroups = messages.reduce((groups, message) => {
      if (!groups[message.threadId]) {
        groups[message.threadId] = [];
      }
      groups[message.threadId].push(message);
      return groups;
    }, {} as Record<string, EmailMessage[]>);

    const currentEnhancedThreadGroups: Record<string, EmailMessage[]> = { ...threadGroups };
    
    const normalizeSubject = (subject: string): string => {
      return subject.replace(/^(Re|Fwd|FW|RE|FWD):\s+/i, '').trim();
    };

    const threadMappings: Record<string, string> = {};
    const recipientSubjectMap: Record<string, string> = {};
    
    Object.entries(threadGroups).forEach(([threadId, threadMessages]) => {
      if (threadMessages.some(msg => msg.messageSource === 'LINKEDIN') || threadMappings[threadId]) {
        return;
      }
      
      threadMessages.forEach(msg => {
        const normalizedSubject = normalizeSubject(msg.subject);
        const recipientSubjectKey1 = `${msg.sender}|${msg.recipientEmail}|${normalizedSubject}`;
        const recipientSubjectKey2 = `${msg.recipientEmail}|${msg.sender}|${normalizedSubject}`;
        
        if (recipientSubjectMap[recipientSubjectKey1] && recipientSubjectMap[recipientSubjectKey1] !== threadId) {
          threadMappings[threadId] = recipientSubjectMap[recipientSubjectKey1];
        } else if (recipientSubjectMap[recipientSubjectKey2] && recipientSubjectMap[recipientSubjectKey2] !== threadId) {
          threadMappings[threadId] = recipientSubjectMap[recipientSubjectKey2];
        } else {
          recipientSubjectMap[recipientSubjectKey1] = threadId;
          recipientSubjectMap[recipientSubjectKey2] = threadId;
        }
      });
    });
    
    Object.entries(threadMappings).forEach(([sourceThreadId, targetThreadId]) => {
      if (currentEnhancedThreadGroups[sourceThreadId] && currentEnhancedThreadGroups[targetThreadId]) {
        currentEnhancedThreadGroups[targetThreadId] = [
          ...currentEnhancedThreadGroups[targetThreadId],
          ...currentEnhancedThreadGroups[sourceThreadId]
        ];
        delete currentEnhancedThreadGroups[sourceThreadId];
      } else {
        console.warn(`Skipping merge: Source (${sourceThreadId}) or Target (${targetThreadId}) not found in currentEnhancedThreadGroups`);
      }
    });

    return currentEnhancedThreadGroups;
  }, [messages]); // Dependency: messages

  // Memoize sorting for performance
  const sortedThreadIds = useMemo(() => {
    console.log("Recalculating sortedThreadIds..."); // Debug log
    return Object.keys(enhancedThreadGroups).sort((a, b) => {
      const aMessages = enhancedThreadGroups[a];
      const bMessages = enhancedThreadGroups[b];
      
      if (!aMessages || aMessages.length === 0) return 1; // Push threads with no messages down
      if (!bMessages || bMessages.length === 0) return -1;

      const aLatest = aMessages.reduce((latest, msg) => {
        const aDate = new Date(msg.receivedAt);
        const latestDate = new Date(latest.receivedAt);
        return aDate.getTime() > latestDate.getTime() ? msg : latest;
      }, aMessages[0]);
      
      const bLatest = bMessages.reduce((latest, msg) => {
        const bDate = new Date(msg.receivedAt);
        const latestDate = new Date(latest.receivedAt);
        return bDate.getTime() > latestDate.getTime() ? msg : latest;
      }, bMessages[0]);
      
      return new Date(bLatest.receivedAt).getTime() - new Date(aLatest.receivedAt).getTime();
    });
  }, [enhancedThreadGroups]); // Dependency: enhancedThreadGroups

  const hasMessages = useMemo(() => Object.keys(enhancedThreadGroups).length > 0, [enhancedThreadGroups]);

  // **MOVED** Helper function to determine the status of a thread
  const getThreadStatus = useCallback((threadId: string): ConversationStatus => {
    const messages = enhancedThreadGroups[threadId];
    if (!messages || messages.length === 0) return 'NO_ACTION_NEEDED'; // Default or handle error

    const latestMessage = messages.reduce((latest, msg) => {
      const msgDate = new Date(msg.receivedAt);
      const latestDate = new Date(latest.receivedAt);
      return msgDate.getTime() > latestDate.getTime() ? msg : latest;
    }, messages[0]);

    // Return the status from the latest message, default if null/undefined
    return latestMessage.status || 'NO_ACTION_NEEDED'; 
  }, [enhancedThreadGroups]); // Depends on the grouped messages

  // **MOVED AGAIN & WRAPPED** Navigate back to list view
  const backToList = useCallback(() => {
    setViewMode('list');
    setSelectedThread(null); // Also clear selection when going back
  }, []);

  // Memoize filtering based on search
  const filteredSortedThreadIds = useMemo(() => {
    // Use imported getThreadStatus which now relies on imported helpers
    return sortedThreadIds.filter(threadId => {
      // Status filter
      if (statusFilter !== 'ALL' && getThreadStatus(threadId) !== statusFilter) {
        return false;
      }
      // Search filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.trim().toLowerCase();
      const messages = enhancedThreadGroups[threadId];
      return messages.some(msg => {
        // Gather all fields to search
        const fields = [
          msg.sender,
          msg.recipientEmail,
          msg.subject,
        ];
        return fields.some(field =>
          field && field.toLowerCase().includes(query)
        );
      });
    });
  }, [sortedThreadIds, statusFilter, searchQuery, enhancedThreadGroups, getThreadStatus]);

  const currentIndex = useMemo(() => {
    if (!selectedThread) return -1;
    return filteredSortedThreadIds.indexOf(selectedThread);
  }, [selectedThread, filteredSortedThreadIds]);

  // useEffect to handle thread selection after messages update
  useEffect(() => {
    // Only proceed if there is a pending selection to handle
    if (pendingThreadSelection) {
      // Check if the pending thread exists in the *current* filtered list
      if (filteredSortedThreadIds.includes(pendingThreadSelection)) {
        // Thread found: Select it
        console.log('Applying pending thread selection:', pendingThreadSelection);
        setSelectedThread(pendingThreadSelection);
      } else {
        // Thread not found: Status change likely removed it from the filtered view
        console.log('Pending thread ID not found in filtered list, returning to list view:', pendingThreadSelection);
        backToList(); 
        // Optional: toast.info('Conversation status updated and moved from current filter.');
      }
      // Reset the pending state now that we've handled it
      setPendingThreadSelection(null); 
    }
  // Depend only on the pending state, the list to check against, and the function to call
  }, [pendingThreadSelection, filteredSortedThreadIds, backToList]);

  // Navigate to thread detail view
  const openThread = (threadId: string) => {
    setSelectedThread(threadId);
    setViewMode('detail');
  };

  // Fetch messages and email accounts
  useEffect(() => {
    const fetchData = async () => {
      console.log('Universal Inbox: Starting data fetch');
      const session = await getSession();
      console.log('Universal Inbox: Session data:', {
        isAuthenticated: !!session,
        organizationId: session?.user?.organizationId,
        role: session?.user?.role
      });

      if (!session?.user?.organizationId) {
        console.log('Universal Inbox: No organization ID in session');
        toast.error('Please select an organization to view messages');
        return;
      }

      setLoading(true);
      try {
        console.log('Fetching data...');
        
        // Fetch messages and accounts concurrently
        const [messagesResponse, emailAccountsResponse, socialAccountsResponse] = await Promise.all([
          fetch('/api/messages'),
          fetch('/api/email-accounts'),
          fetch('/api/social-accounts')
        ]);
        
        // Handle messages response
        if (!messagesResponse.ok) {
          const errorData = await messagesResponse.json().catch(() => ({ error: 'Failed to parse error response' }));
          console.error('Messages API error:', errorData);
          throw new Error(errorData.error || `Failed to fetch messages: ${messagesResponse.status}`);
        }
        
        // Handle email accounts response
        if (!emailAccountsResponse.ok) {
          const errorData = await emailAccountsResponse.json().catch(() => ({ error: 'Failed to parse error response' }));
          console.error('Email accounts API error:', errorData);
          throw new Error(errorData.error || `Failed to fetch email accounts: ${emailAccountsResponse.status}`);
        }

        // Handle social accounts response
        if (!socialAccountsResponse.ok) {
          const errorData = await socialAccountsResponse.json().catch(() => ({ error: 'Failed to parse error response' }));
          console.error('Social accounts API error:', errorData);
          throw new Error(errorData.error || `Failed to fetch social accounts: ${socialAccountsResponse.status}`);
        }
        
        // Parse all responses
        const [messages, emailAccounts, socialAccounts] = await Promise.all([
          messagesResponse.json(),
          emailAccountsResponse.json(),
          socialAccountsResponse.json()
        ]);
        
        console.log('Fetched data:', {
          messages: messages.length,
          emailAccounts: emailAccounts.length,
          socialAccounts: socialAccounts.length
        });
        
        // Update all state
        setMessages(messages);
        setEmailAccounts(emailAccounts);
        setSocialAccounts(socialAccounts);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Remove local isOurEmail helper, use imported one
  // const isOurEmail = ... (removed)

  // Helper function to find the other participant in a thread (uses imported isOurEmail)
  const findOtherParticipant = (messages: EmailMessage[]) => {
    // Sort messages by date (oldest first) to find the original conversation
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
    );

    // First try to find the original recipient if we started the thread
    const firstMessage = sortedMessages[0];
    // Use imported isOurEmail
    if (isOurEmail(firstMessage.sender, firstMessage, emailAccounts, socialAccounts)) {
      return firstMessage.recipientEmail;
    }

    // Otherwise, use the first sender who isn't us
    const externalParticipant = sortedMessages.find(
      // Use imported isOurEmail
      msg => !isOurEmail(msg.sender, msg, emailAccounts, socialAccounts)
    );
    if (externalParticipant) {
      return externalParticipant.sender;
    }

    // Fallback to the original recipient (shouldn't reach here in normal cases)
    return firstMessage.recipientEmail;
  };

  // Update the useEffect that handles pre-selection
  useEffect(() => {
    // Only pre-select if the modal is being opened and the user hasn't manually selected an email
    if (isReplying && selectedThread && enhancedThreadGroups[selectedThread] && !userSelectedEmailRef.current) {
      const messages = enhancedThreadGroups[selectedThread];
      const latestMessage = messages.sort((a, b) => 
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      )[0];
      
      const isLinkedInMessage = latestMessage.messageSource === 'LINKEDIN';
      
      if (isLinkedInMessage && latestMessage.socialAccountId) {
        // For LinkedIn messages, find the social account
        const socialAccount = socialAccounts.find(account => 
          account.id === latestMessage.socialAccountId
        );
        
        if (socialAccount) {
          setSelectedSocialAccount(socialAccount.id);
          console.log('Pre-selected LinkedIn account:', socialAccount.name);
        } else {
          console.log('Could not find matching social account for ID:', latestMessage.socialAccountId);
          setSelectedSocialAccount('');
        }
      } else {
        // For email messages, find our email account that was involved in the conversation
        const ourEmail = emailAccounts.find(account => 
          messages.some(msg => 
            msg.sender === account.email || msg.recipientEmail === account.email
          )
        );

        if (ourEmail) {
          setSelectedFromEmail(ourEmail.email);
          console.log('Pre-selected email account:', ourEmail.email);
        } else {
          setSelectedFromEmail('');
        }
      }
    }
    
    // Reset the user selection flag when the modal closes
    if (!isReplying) {
      userSelectedEmailRef.current = false;
    }
  }, [isReplying, selectedThread, emailAccounts, socialAccounts, enhancedThreadGroups]);

  // Filter visible accounts for UI display
  const visibleEmailAccounts = emailAccounts.filter(account => !account.isHidden);

  // Update useEffect for scrolling AND focusing
  useEffect(() => {
    if (isReplying) {
      // Scroll card into view
      replyCardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest' 
      });
      // Focus textarea after a short delay to allow for scroll/render
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100); // Small delay might be needed
    }
  }, [isReplying]);

  const handleReply = async () => {
    if (!selectedThread) return;
    
    const threadMessages = enhancedThreadGroups[selectedThread];
    const isLinkedIn = isLinkedInThread(threadMessages);
    
    // Check required fields based on message type
    if (!replyContent.trim()) return;
    if (isLinkedIn && !selectedSocialAccount) return;
    if (!isLinkedIn && !selectedFromEmail) return;
    
    setReplying(true);
    try {
      const latestMessage = threadMessages.sort((a, b) => 
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      )[0];
      
      // Get the correct recipient (the other participant in the thread)
      const toAddress = findOtherParticipant(threadMessages);

      // Find the original message in the thread (the first message)
      const originalMessage = threadMessages.sort((a, b) => 
        new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
      )[0];

      // Prepare account information based on message type
      let accountInfo = {
        id: '',
        email: '',
        name: ''
      };

      if (isLinkedIn) {
        // For LinkedIn messages, find the associated social account
        const socialAccount = socialAccounts.find(account => account.id === selectedSocialAccount);
        if (!socialAccount) {
          throw new Error('Please select a valid LinkedIn account to send from');
        }
        
        console.log('Using LinkedIn account for reply:', socialAccount.name);
        
        // For the backend, we need to use an email account - let's use the LinkedIn integration account
        // Find that special account by name pattern
        const integrationAccount = emailAccounts.find(account => 
          account.email.includes('linkedin-integration') || account.name === 'LinkedIn Integration'
        );
        
        if (!integrationAccount) {
          throw new Error('LinkedIn integration account not found. Please reload the page and try again.');
        }
        
        accountInfo = {
          id: integrationAccount.id,
          email: integrationAccount.email,
          name: socialAccount.name // Use the social account name for display
        };
      } else {
        // For regular email messages, use the selected email account
        const emailAccount = emailAccounts.find(account => account.email === selectedFromEmail);
        if (!emailAccount) {
          throw new Error('Please select a valid email account to send from');
        }
        
        console.log('Using email account for reply:', emailAccount.email);
        
        accountInfo = {
          id: emailAccount.id,
          email: emailAccount.email,
          name: emailAccount.name
        };
      }

      // Construct request body - use the original message ID
      const requestBody = {
        messageId: originalMessage.messageId, // Use the original message's ID
        content: replyContent,
        action: 'reply',
        fromEmail: accountInfo.email,
        toAddress,
        // Include the selected socialAccountId for LinkedIn messages
        ...(isLinkedIn && selectedSocialAccount ? { socialAccountId: selectedSocialAccount } : {})
      };

      console.log('Sending reply with payload:', requestBody);

      const response = await fetch('/api/messages/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reply');
      }

      const responseData = await response.json();
      console.log('Reply sent successfully:', responseData);

      // Update the thread status to WAITING_FOR_REPLY
      await updateMessageStatus(selectedThread, 'WAITING_FOR_REPLY');

      // Show appropriate success message based on message type
      toast.success(isLinkedIn ? 'LinkedIn reply sent successfully' : 'Email reply sent successfully');
      
      setIsReplying(false);
      setReplyContent('');
      
      // Reset selected accounts
      if (isLinkedIn) {
        setSelectedSocialAccount('');
      } else {
        setSelectedFromEmail('');
      }
      
      // Store the current thread ID before refresh
      const currentThreadId = selectedThread;
      
      // Refresh messages
      const messagesResponse = await fetch('/api/messages');
      if (!messagesResponse.ok) throw new Error('Failed to fetch messages');
      const messagesData = await messagesResponse.json();
      
      // Update messages state
      setMessages(messagesData);
      
      // Instead of setting selectedThread directly, set pending selection
      setPendingThreadSelection(currentThreadId);
      
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  // Handle message deletion
  const handleDelete = async (message: EmailMessage) => {
    setMessageToDelete(message);
    setShowDeleteModal(true);
  };

  // Confirm and execute deletion
  const confirmDelete = async () => {
    if (!messageToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/messages/${messageToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete message');
      }

      // Remove message from state
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== messageToDelete.id)
      );

      // Clear selected thread if it was the last message
      const remainingThreadMessages = messages.filter(
        msg => msg.threadId === messageToDelete.threadId && msg.id !== messageToDelete.id
      );
      if (remainingThreadMessages.length === 0) {
        setSelectedThread(null);
        setViewMode('list');
      }

      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete message');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setMessageToDelete(null);
    }
  };

  // Update conversation status
  const updateConversationStatus = async (threadId: string, status: ConversationStatus) => {
    if (updatingStatus) return;
    
    setUpdatingStatus(true);
    try {
      // Call the server action directly
      const result = await updateMessageStatus(threadId, status);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update status');
      }

      // Update status in the local state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.threadId === threadId 
            ? { ...msg, status: status } 
            : msg
        )
      );

      toast.success(`Conversation marked as ${getStatusLabel(status)}`);
      setStatusFilter('ALL'); // Reset filter to ensure the updated item is visible
      setViewMode('list'); // Return to list view after status update
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Add the function to get AI suggestions
  const getAISuggestions = async () => {
    if (!selectedThread || !enhancedThreadGroups[selectedThread] || enhancedThreadGroups[selectedThread].length === 0) {
      return;
    }

    setGettingSuggestions(true);
    setSuggestionStatus('idle');

    try {
      // Get the latest message in the thread
      const latestMessage = enhancedThreadGroups[selectedThread].sort((a, b) => 
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      )[0];

      // Make sure latestMessage.content is properly handled to preserve line breaks
      // JSON.stringify will properly escape line breaks, so we don't need to modify the content
      // Create payload with the structure shown in the requirements - content should be raw as stored in DB
      const payload = [
        {
          id: latestMessage.id,
          messageId: latestMessage.messageId,
          threadId: latestMessage.threadId,
          organizationId: latestMessage.organizationId,
          emailAccountId: latestMessage.emailAccountId,
          subject: latestMessage.subject,
          sender: latestMessage.sender,
          recipientEmail: latestMessage.recipientEmail,
          content: latestMessage.content, // Raw content with line breaks preserved
          receivedAt: latestMessage.receivedAt,
          messageType: latestMessage.messageType,
          isRead: latestMessage.isRead,
          classificationScores: latestMessage.classificationScores,
          unipileEmailId: latestMessage.unipileEmailId,
          status: latestMessage.status,
          messageSource: latestMessage.messageSource,
          socialAccountId: latestMessage.socialAccountId,
          userSuggestion: userSuggestionInput // Include user's optional suggestion
        }
      ];

      console.log('Sending payload with content:', payload[0].content); // Log for debugging

      // Send request to our API endpoint instead of directly to the webhook
      const response = await fetch('/api/aisuggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('AI Suggestions webhook response:', data);
      
      setSuggestionStatus('success');
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      setSuggestionStatus('error');
    } finally {
      setGettingSuggestions(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <PageHeader
            title="Universal Inbox"
            description="View and manage all your email communications in one place."
          />
          <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-gray-500 gap-3">
            <LoaderIcon className="h-8 w-8 animate-spin" />
            <p>Loading your messages...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex flex-col space-y-6">
          {/* PageHeader is already used here, no changes needed for the header itself */}
          <PageHeader
            title="Universal Inbox"
            description="View and manage all your email communications in one place."
          />
        </div>

        {viewMode === 'list' ? (
          // List View (Full Width)
          <ClientCard className="h-[calc(100vh-14rem)] overflow-hidden flex flex-col border-slate-200/60 shadow-lg shadow-slate-200/50">
            <div className="px-6 py-6 border-b border-slate-200/60 bg-white/95">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-x-4 gap-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900 mb-2 sm:mb-0">
                  <InboxIcon className="h-5 w-5 text-slate-500" />
                  <span>Conversations</span>
                </h2>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative flex-1 max-w-lg">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Search messages…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-12 pr-4 py-3 w-full rounded-xl border-2 border-slate-200 shadow focus:border-blue-400 text-lg font-medium bg-white transition-all"
                      aria-label="Search messages"
                      style={{ minHeight: '3.25rem' }}
                    />
                  </div>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ConversationStatus | 'ALL')}
                    className="py-3 px-4 rounded-xl border-2 border-slate-200 shadow bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                    aria-label="Filter by status"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="FOLLOW_UP_NEEDED">Follow Up Needed</option>
                    <option value="WAITING_FOR_REPLY">Waiting for Reply</option>
                    <option value="MEETING_BOOKED">Meeting Booked</option>
                    <option value="NOT_INTERESTED">Not Interested</option>
                    <option value="NO_ACTION_NEEDED">No Action Needed</option>
                  </select>
                </div>
              </div>
            </div>
            
            {hasMessages ? (
              <div className="divide-y divide-slate-200/60 overflow-y-auto flex-1">
                {/* Filter threads based on the selected status */}
                {(() => {
                  const filteredThreads = filteredSortedThreadIds.filter(
                    threadId => statusFilter === 'ALL' || getThreadStatus(threadId) === statusFilter
                  );
                  
                  if (filteredThreads.length === 0) {
                    return (
                      <div className="p-8 text-center">
                        <p className="text-slate-600">No messages found matching the status filter.</p>
                        <button 
                          onClick={() => setStatusFilter('ALL')}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          Show all messages
                        </button>
                      </div>
                    );
                  }
                  
                  return <>
                    {filteredThreads.map(threadId => {
                      const messages = enhancedThreadGroups[threadId];
                      const latestMessage = messages.reduce((latest, msg) => {
                        const msgDate = new Date(msg.receivedAt);
                        const latestDate = new Date(latest.receivedAt);
                        return msgDate.getTime() > latestDate.getTime() ? msg : latest;
                      }, messages[0]);
                      
                      const isLatestFromUs = isOurEmail(latestMessage.sender, latestMessage, emailAccounts, socialAccounts); // Use imported helper
                      const needsResponse = !isLatestFromUs && !latestMessage.isRead;
                      const isLinkedIn = latestMessage.messageSource === 'LINKEDIN';

                      // Use the helper function to get the thread status
                      const status = getThreadStatus(threadId);

                      const statusColor = getStatusColor(status); // Use imported helper (remove unused args)
                      const rowStyle = getStatusRowStyle(status, new Date(latestMessage.receivedAt), isLatestFromUs); // Keep local row style helper

                      return (
                        <button
                          key={threadId}
                          className={cn(
                            "w-full px-6 py-4 text-left transition-all",
                            "hover:bg-slate-50/80 relative",
                            needsResponse ? "bg-blue-50/70 hover:bg-blue-50/90" : "",
                            rowStyle
                          )}
                          onClick={() => openThread(threadId)}
                        >
                          <div className="grid grid-cols-12 gap-4">
                            {/* Sender & Date */}
                            <div className="col-span-3">
                              <div className="font-medium text-slate-900 truncate flex items-center gap-1">
                                {/* Replace LinkedInIcon usage */}
                                {isLinkedIn && <span className="text-xs font-normal text-blue-600 mr-1">(LI)</span>}
                                {isLinkedIn
                                  ? getLinkedInSenderName(latestMessage.sender, latestMessage, socialAccounts) // Use imported helper
                                  : findOtherParticipant(messages)}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {formatDateInCentralTime(latestMessage.receivedAt)} {/* Use imported function */}
                              </div>
                            </div>

                            {/* Subject & Preview */}
                            <div className="col-span-7">
                              <div className="font-medium text-slate-800 truncate">
                                {isLinkedIn ? 'LinkedIn Message' : latestMessage.subject}
                              </div>
                              <div className="text-sm text-slate-600 truncate mt-1">
                                {latestMessage.content.replace(/<[^>]*>/g, '').slice(0, 100)}
                                {latestMessage.content.replace(/<[^>]*>/g, '').length > 100 ? '...' : ''}
                              </div>
                            </div>
                            
                            {/* Status & Days */}
                            <div className="col-span-2 flex flex-col items-end justify-center">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium mb-1",
                                statusColor // Use result from imported helper
                              )}>
                                {getStatusLabel(status)} {/* Use imported helper */}
                              </span>

                              {status === 'FOLLOW_UP_NEEDED' && isLatestFromUs && daysSince(new Date(latestMessage.receivedAt)) > 0 && ( // daysSince remains local
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-xs font-medium",
                                  daysSince(new Date(latestMessage.receivedAt)) < 3 ? "bg-blue-100 text-blue-800" : "bg-red-200 text-red-900"
                                )}>
                                  {daysSince(new Date(latestMessage.receivedAt))}d
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </>;
                })()}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-slate-600">No messages found.</p>
              </div>
            )}
          </ClientCard>
        ) : (
          // Detail View (Container for BOTH cards)
          <>
            {/* First Card: Message Thread */}
            <ClientCard className="h-[calc(100vh-14rem)] overflow-hidden flex flex-col border-slate-200/60 shadow-lg shadow-slate-200/50">
              <div className="px-6 py-4 border-b border-slate-200/60 flex justify-between items-center bg-white/95">
                <div className="flex items-center gap-2 min-w-0 max-w-[60%]">
                  <ClientButton 
                    variant="ghost" 
                    size="sm"
                    className="text-slate-600 hover:text-slate-800 hover:bg-slate-50 flex-shrink-0"
                    onClick={backToList}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    <span>Back</span>
                  </ClientButton>
                  
                  <ClientButton
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (currentIndex > 0) {
                        setSelectedThread(filteredSortedThreadIds[currentIndex - 1]);
                      }
                    }}
                    disabled={currentIndex <= 0}
                    aria-label="Previous conversation"
                    className="flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </ClientButton>

                  <ClientButton
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (currentIndex !== -1 && currentIndex < filteredSortedThreadIds.length - 1) {
                        setSelectedThread(filteredSortedThreadIds[currentIndex + 1]);
                      }
                    }}
                    disabled={currentIndex === -1 || currentIndex >= filteredSortedThreadIds.length - 1}
                    aria-label="Next conversation"
                    className="flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </ClientButton>
                  
                  <div className="h-6 w-px bg-slate-200 mx-1"></div>

                  <h2 className="text-lg font-semibold text-slate-900 truncate overflow-hidden text-ellipsis">
                    {selectedThread ? findOtherParticipant(enhancedThreadGroups[selectedThread]) : ''}
                  </h2>
                </div>
                <div className="flex gap-2 items-center flex-shrink-0">
                  <div className="flex bg-slate-50 rounded-md p-1 gap-1">
                    <ClientButton 
                      variant="ghost" 
                      size="sm"
                      className="text-green-600 hover:text-green-800 hover:bg-green-50"
                      onClick={() => selectedThread && updateConversationStatus(selectedThread, 'MEETING_BOOKED')}
                      disabled={updatingStatus}
                    >
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      <span>Meeting Booked</span>
                    </ClientButton>
                    
                    <ClientButton 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      onClick={() => selectedThread && updateConversationStatus(selectedThread, 'NOT_INTERESTED')}
                      disabled={updatingStatus}
                    >
                      <ThumbsDownIcon className="h-4 w-4 mr-1" />
                      <span>Not Interested</span>
                    </ClientButton>
                    
                    <ClientButton 
                      variant="ghost" 
                      size="sm"
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      onClick={() => selectedThread && updateConversationStatus(selectedThread, 'NO_ACTION_NEEDED')}
                      disabled={updatingStatus}
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      <span>No Action</span>
                    </ClientButton>
                    
                    <ClientButton 
                      variant="ghost" 
                      size="sm"
                      className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                      onClick={() => selectedThread && updateConversationStatus(selectedThread, 'FOLLOW_UP_NEEDED')}
                      disabled={updatingStatus}
                    >
                      <ClockIcon className="h-4 w-4 mr-1" />
                      <span>Follow Up</span>
                    </ClientButton>
                  </div>

                  <div className="flex gap-2">
                    <ClientButton 
                      variant="outline" 
                      size="sm"
                      className="text-blue-600 border-blue-300 hover:text-blue-800 hover:bg-blue-50"
                      onClick={() => setIsReplying(true)}
                    >
                      <ReplyIcon className="h-4 w-4 mr-1" />
                      <span>Reply</span>
                    </ClientButton>

                    <ClientButton 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 border-red-300 hover:text-red-800 hover:bg-red-50"
                      onClick={() => {
                        if (!selectedThread) return;
                        const latestMessage = enhancedThreadGroups[selectedThread].sort((a, b) => 
                          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
                        )[0];
                        handleDelete(latestMessage);
                      }}
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      <span>Delete</span>
                    </ClientButton>
                  </div>
                </div>
              </div>
              
              {selectedThread && (
                <div className="flex h-full flex-col">
                  {selectedThread && enhancedThreadGroups[selectedThread] && 
                   isLinkedInThread(enhancedThreadGroups[selectedThread]) && (
                    <div className="flex items-center justify-end border-b border-gray-200 p-4">
                      <button
                        className="flex items-center space-x-1 rounded bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600"
                        onClick={() => {
                          // Get the first message of the thread 
                          const messages = enhancedThreadGroups[selectedThread];
                          const message = messages[0]; // Use the first message in the thread
                          
                          // Find the correct social account to get the Unipile account ID
                          const socialAccount = socialAccounts.find(acc => acc.id === message.socialAccountId);
                          const unipileAccountId = socialAccount?.unipileAccountId || '';
                          
                          toast.info("Retrieving full chat history...");
                          fetch("https://n8n-n8n.swl3bc.easypanel.host/webhook/linkedin-conversation", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              // Send all available message data
                              thread_id: message.threadId,
                              account_id: message.socialAccountId,
                              organization_id: message.organizationId,
                              message_id: message.messageId,
                              id: message.id,
                              subject: message.subject,
                              sender: message.sender,
                              recipient_email: message.recipientEmail,
                              content: message.content,
                              received_at: message.receivedAt,
                              message_type: message.messageType,
                              is_read: message.isRead,
                              status: message.status,
                              message_source: message.messageSource,
                              unipile_account_id: unipileAccountId, // Use the correct Unipile account ID from the social account
                              unipile_email_id: message.unipileEmailId,
                              email_account_id: message.emailAccountId,
                              classification_scores: message.classificationScores,
                            }),
                          })
                          .then((response) => response.json())
                          .then((data) => {
                            console.log("Success:", data);
                            toast.success("Chat history retrieved successfully!");
                          })
                          .catch((error) => {
                            console.error("Error:", error);
                            toast.error("Failed to retrieve chat history");
                          });
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Get Full Chat</span>
                      </button>
                    </div>
                  )}
                  
                  <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {enhancedThreadGroups[selectedThread]
                      .sort((a, b) => {
                        // Extract timestamp from messageId if it exists (messageIds often contain timestamps)
                        const aIdTime = a.messageId.match(/^(\d+)/);
                        const bIdTime = b.messageId.match(/^(\d+)/);
                        
                        // If both messages have timestamp-based IDs, use those for primary sorting
                        if (aIdTime && bIdTime) {
                          return parseInt(aIdTime[1]) - parseInt(bIdTime[1]);
                        }
                        
                        // If timestamps are very close (within 2 seconds), use messageId as secondary sort
                        const aDate = new Date(a.receivedAt);
                        const bDate = new Date(b.receivedAt);
                        const timeDiff = Math.abs(aDate.getTime() - bDate.getTime());
                        
                        if (timeDiff < 2000) {
                          // Use message ID as secondary sort key
                          return a.messageId.localeCompare(b.messageId);
                        }
                        
                        // Default to standard timestamp sort
                        return aDate.getTime() - bDate.getTime();
                      })
                      .map((message, index, array) => {
                        const isFromUs = isOurEmail(message.sender, message, emailAccounts, socialAccounts); // Use imported helper
                        const isLastMessage = index === array.length - 1;
                        const isLatestMessage = index === array.length - 1;
                        const isLinkedIn = message.messageSource === 'LINKEDIN';
                        
                        // Determine message status for the thread
                        const latestMessage = array[array.length - 1];
                        let status: ConversationStatus = latestMessage.status || 'FOLLOW_UP_NEEDED';
                        
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "py-5 px-6 rounded-lg",
                              isFromUs ? "bg-blue-50/80 border border-blue-100/50" : "bg-white border border-slate-200/60"
                            )}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="min-w-0 max-w-[70%]">
                                <p className="font-medium text-slate-900 flex items-center gap-1 truncate overflow-hidden text-ellipsis">
                                  {/* Replace LinkedInIcon usage */}
                                  {isLinkedIn && <span className="text-xs font-normal text-blue-600 mr-1">(LI)</span>}
                                  <span className="truncate">
                                  {isLinkedIn
                                    ? getLinkedInSenderName(message.sender, message, socialAccounts) // Use imported helper
                                    : message.sender}
                                  </span>
                                   {isFromUs && <span className="text-xs text-blue-600 font-normal ml-1">(You)</span>} {/* Added (You) indicator */}
                                </p>
                                {/* Add console log for debugging */}
                                {(() => {
                                  if (!isLinkedIn && message.recipientEmail) {
                                    console.log('Attempting to render recipient dropdown area for message:', message.id);
                                  }
                                  return null; // This IIFE is just for the side effect
                                })()}
                                {/* Modify "to" display for dropdown (Phase 2, Step 4) */}
                                {!isLinkedIn && message.recipientEmail && (
                                  <div className="flex items-center gap-0 mt-0.5"> {/* Removed gap */}
                                    <p className="text-xs text-slate-500 truncate overflow-hidden text-ellipsis shrink">
                                      to {message.recipientEmail}
                                    </p>
                                    <DropdownMenu onOpenChange={(open) => {
                                      // Fetch only when opening and if not already loaded/loading for this specific message
                                      if (open && !recipientDetails[message.id]?.data && !recipientDetails[message.id]?.loading) {
                                        fetchRecipients(message.id, message.messageId, message.organizationId);
                                      }
                                    }}>
                                      <DropdownMenuTrigger asChild>
                                        {/* Slightly larger button/icon, more negative margin */}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0 ml-[-12px]">
                                          <ChevronDown className="h-5 w-5" />
                                          <span className="sr-only">Show all recipients</span>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-64 max-h-60 overflow-y-auto">
                                        {/* Add check for recipientDetails[message.id] existence and assign to variable */}
                                        {(() => {
                                          const details = recipientDetails[message.id];
                                          if (details) {
                                            return (
                                              <>
                                                {details.loading && (
                                                  <DropdownMenuItem disabled className="flex justify-center items-center text-slate-500">
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                                                  </DropdownMenuItem>
                                                )}
                                                {details.error && (
                                                  <DropdownMenuItem disabled className="text-red-600 text-xs">
                                                    Error: {details.error}
                                                  </DropdownMenuItem>
                                                )}
                                                {/* Check for data being an empty array specifically */}
                                                {details.data && details.data?.length === 0 && (
                                                  <DropdownMenuItem disabled className="text-xs text-slate-500">No other recipients found.</DropdownMenuItem>
                                                )}
                                                {/* Check for data being a non-empty array */}
                                                {details.data && details.data?.length > 0 && (
                                                  <>
                                                    {details.data?.map((recipient, idx) => (
                                                      <DropdownMenuItem key={idx} className="text-xs p-1.5">
                                                        <span className="font-medium w-8 inline-block mr-1 uppercase text-slate-500 flex-shrink-0">{recipient.recipientType}:</span>
                                                        <span className="text-slate-700 truncate">{recipient.recipientEmail}</span>
                                                      </DropdownMenuItem>
                                                    ))}
                                                  </>
                                                )}
                                              </>
                                            );
                                          } else {
                                            // Optional: Render something if the entry doesn't exist yet (e.g., before first open)
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
                                  {formatDateInCentralTime(message.receivedAt)} {/* Use imported function */}
                                </div>
                                {isLinkedIn && isLatestMessage && (
                                  <div></div>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-3 text-sm text-slate-800 whitespace-pre-wrap" 
                                 dangerouslySetInnerHTML={{ __html: message.content }} />
                          </div>
                        );
                      })}
                    {/* Add padding div at the bottom to ensure last message is fully visible */}
                    <div className="h-10"></div>
                  </div>
                </div>
              )}
            </ClientCard>
            
            {/* Second Card: Inline Reply Section (Appears Conditionally Below) */}
            {isReplying && selectedThread && (
              <ClientCard ref={replyCardRef} className="mt-6 border-slate-200/60 shadow-lg shadow-slate-200/50">
                <div className="p-6 space-y-6"> {/* Increased overall vertical spacing slightly */}
                  {/* Form Fields */}
                  <div className='grid grid-cols-2 gap-4'>
                    {/* From Select */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        From
                      </label>
                      {enhancedThreadGroups[selectedThread] && 
                       isLinkedInThread(enhancedThreadGroups[selectedThread]) ? (
                        <select
                          value={selectedSocialAccount}
                          onChange={(e) => {
                            setSelectedSocialAccount(e.target.value);
                            userSelectedEmailRef.current = true;
                          }}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                          data-component-name="UniversalInboxClient"
                        >
                          <option value="">Select a LinkedIn account</option>
                          {socialAccounts
                            .filter(account => account.provider === 'LINKEDIN')
                            .map(account => (
                            <option 
                              key={account.id} 
                              value={account.id}
                            >
                              {account.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={selectedFromEmail}
                          onChange={(e) => {
                            setSelectedFromEmail(e.target.value);
                            userSelectedEmailRef.current = true;
                          }}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                        >
                          <option value="">Select an email account</option>
                          {visibleEmailAccounts.map((account) => (
                            <option key={account.id} value={account.email}>
                              {account.email}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    
                    {/* To Display */}
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">
                         To
                       </label>
                       <div className="text-sm text-slate-900 border border-slate-300 rounded-md p-2 bg-white h-[42px] flex items-center">
                         {enhancedThreadGroups[selectedThread] ? 
                           findOtherParticipant(enhancedThreadGroups[selectedThread]) : 
                          ''}
                      </div>
                    </div>
                  </div>

                  {/* Textarea (Full Width) */}
                  <div>
                    <label htmlFor="replyTextArea" className="sr-only">Reply Content</label>
                    <textarea
                      ref={textareaRef} // Attach ref
                      id="replyTextArea" 
                      value={replyContent}
                       onChange={(e) => setReplyContent(e.target.value)}
                       placeholder="Type your reply here..."
                       className="w-full h-[30vh] p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none whitespace-pre-wrap bg-white text-slate-900"
                     />
                   </div>

                  {/* Action Buttons (Moved Here) */}
                  <div className="flex justify-end gap-3"> 
                    {/* Removed border-t, bg-slate-50, px-6, py-4. Relying on parent space-y-6 */}
                    <ClientButton
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsReplying(false);
                          setReplyContent(''); 
                        }}
                      >
                        Cancel
                      </ClientButton>
                    <ClientButton
                        size="sm"
                        onClick={handleReply}
                        disabled={
                          !replyContent.trim() || 
                          replying || 
                          (isLinkedInThread(enhancedThreadGroups[selectedThread || '']) ? !selectedSocialAccount : !selectedFromEmail)
                        }
                        className="flex items-center gap-2"
                      >
                        {replying ? (
                          <LoaderIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <SendIcon className="h-4 w-4" />
                        )}
                        {replying ? 'Sending...' : 'Send Reply'}
                      </ClientButton>
                  </div>
                  
                  {/* AI Suggestions Section (Now Below Buttons) */}
                  <div className="pt-6 border-t border-slate-200/60">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-base font-medium text-slate-800 flex items-center">
                            {/* Added Icon */}
                            <Sparkles className="w-4 h-4 mr-2 inline text-blue-600" /> 
                            AI Suggested Replies
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">Scroll to view all suggestions</p>
                        </div>
                        <div className="flex items-center">
                            {/* ... suggestion status indicators ... */}
                            {/* Converted to ClientButton */}
                            <ClientButton
                              onClick={getAISuggestions}
                              disabled={gettingSuggestions}
                              size="sm" // Match other buttons
                              // variant default (primary blue)
                            >
                              {gettingSuggestions ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  <span>Requesting...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  <span>Get Suggestions</span> {/* Slightly shorter text */}
                                </>
                              )}
                            </ClientButton>
                          </div>
                      </div>

                    {/* User Suggestion Input */}
                    <div className="mb-4"> {/* Add some margin below */}
                      <label htmlFor="userSuggestionInput" className="block text-sm font-medium text-slate-700 mb-1">
                        Optional: Add your own suggestions or context
                      </label>
                      <textarea
                        id="userSuggestionInput"
                        value={userSuggestionInput}
                        onChange={(e) => setUserSuggestionInput(e.target.value)}
                        placeholder="Hey, input any suggestions..."
                        className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[60px] bg-white text-slate-900" // Allow vertical resize
                        rows={2} // Start with 2 rows
                      />
                    </div>
                      
                    {/* Suggestion Boxes */}
                    <div className="space-y-3 pr-2">
                      {enhancedThreadGroups[selectedThread] && enhancedThreadGroups[selectedThread].length > 0 && 
                        (() => {
                          const latestMessage = enhancedThreadGroups[selectedThread].sort((a, b) => 
                            new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
                          )[0];
                          const SuggestionBox = ({ suggestion, index }: { suggestion: string | null | undefined, index: number }) => (
                            <div className="relative rounded-md border border-slate-200 p-3 bg-slate-50/80 hover:bg-slate-100 transition-colors">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-medium text-sm text-slate-700">AI Suggestion #{index}</h4>
                                {suggestion && (
                                  /* Converted to ClientButton with ghost variant */
                                  <ClientButton 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      const trimmedSuggestion = suggestion.replace(/^\s+|\s+$/g, '');
                                      setReplyContent(trimmedSuggestion);
                                    }}
                                    className="text-blue-600 hover:text-blue-700 px-2" // Adjusted padding for ghost
                                  >
                                    Use This
                                  </ClientButton>
                                )}
                              </div>
                              <div 
                                className={`text-xs ${suggestion ? 'text-slate-800' : 'text-slate-400 italic'} pr-2`}
                              >
                                <div className="whitespace-pre-wrap">
                                  {suggestion || `AI suggestion #${index} will appear here`}
                                </div>
                              </div>
                            </div>
                          );
                          return (
                            <>
                              <SuggestionBox suggestion={latestMessage.aiSuggestion1} index={1} />
                              <SuggestionBox suggestion={latestMessage.aiSuggestion2} index={2} />
                              <SuggestionBox suggestion={latestMessage.aiSuggestion3} index={3} />
                            </>
                          );
                        })()
                      }
                    </div>
                  </div>
                </div>
              </ClientCard>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && messageToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[400px] flex flex-col shadow-xl border border-slate-200/60">
            <div className="px-6 py-4 border-b border-slate-200/60 flex justify-between items-center bg-white/95">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                <TrashIcon className="h-5 w-5 text-red-500" />
                <span>Delete Message</span>
              </h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setMessageToDelete(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-700">
                Are you sure you want to delete this message? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-200/60 flex justify-end gap-3">
              <ClientButton
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setMessageToDelete(null);
                }}
              >
                Cancel
              </ClientButton>
              <ClientButton
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              >
                {deleting ? (
                  <LoaderIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <TrashIcon className="h-4 w-4" />
                )}
                {deleting ? 'Deleting...' : 'Delete Message'}
              </ClientButton>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

<style jsx global>{`
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
  }
  
  .scroll-shadow-bottom {
    position: relative;
    background-image: 
      linear-gradient(to top, rgba(241, 241, 241, 0), rgba(241, 241, 241, 0) 85%);
    background-attachment: local;
  }
  
  .custom-scrollbar::-webkit-scrollbar-corner {
    background: transparent;
  }
`}</style>
