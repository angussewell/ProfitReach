'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { ClientCard, ClientButton, ClientInput } from '@/components/ui/client-components';
import { Inbox, Loader2, MessageSquare, Reply, Send, Trash2, X, Calendar, ThumbsDown, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideProps } from 'lucide-react';
import { toast } from 'sonner';
import { updateMessageStatus } from '@/lib/server-actions';
import { formatDateInCentralTime } from '@/lib/date-utils';

type MessageType = 'REAL_REPLY' | 'BOUNCE' | 'AUTO_REPLY' | 'OUT_OF_OFFICE' | 'OTHER';
type ConversationStatus = 'MEETING_BOOKED' | 'NOT_INTERESTED' | 'FOLLOW_UP_NEEDED' | 'NO_ACTION_NEEDED';
type MessageSource = 'EMAIL' | 'LINKEDIN';

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
const getStatusRowStyle = (status: ConversationStatus, latestMessageDate: Date, isFromUs: boolean): string => {
  // Base subtle background and left border styling
  let style = 'border-l-4 ';
  
  if (status === 'MEETING_BOOKED') {
    return style + 'border-green-500 bg-green-50/50';
  }
  
  if (status === 'NOT_INTERESTED') {
    return style + 'border-gray-500 bg-gray-50/50';
  }
  
  if (status === 'NO_ACTION_NEEDED') {
    return style + 'border-blue-500 bg-blue-50/50';
  }
  
  // For FOLLOW_UP_NEEDED
  if (status === 'FOLLOW_UP_NEEDED') {
    // "Waiting for Reply" condition: it's from us and less than 3 days old
    if (isFromUs) {
      const days = daysSince(latestMessageDate);
      if (days < 3) {
        return style + 'border-blue-300 bg-blue-50/30'; // Blue for "Waiting for Reply"
      }
    }
    return style + 'border-red-600 bg-red-50/60'; // Red for "Follow Up Needed"
  }
  
  return style + 'border-blue-300 bg-blue-50/30'; // Default fallback
};

// Helper function to get status color for the badge
const getStatusColor = (status: ConversationStatus, latestMessageDate: Date, isFromUs: boolean): string => {
  if (status === 'MEETING_BOOKED') {
    return 'bg-green-100 text-green-800';
  }
  
  if (status === 'NOT_INTERESTED') {
    return 'bg-gray-100 text-gray-800';
  }
  
  if (status === 'NO_ACTION_NEEDED') {
    return 'bg-blue-100 text-blue-800';
  }
  
  // For FOLLOW_UP_NEEDED
  if (status === 'FOLLOW_UP_NEEDED') {
    // "Waiting for Reply" condition: it's from us and less than 3 days old
    if (isFromUs) {
      const days = daysSince(latestMessageDate);
      if (days < 3) {
        return 'bg-blue-100 text-blue-800'; // Blue for "Waiting for Reply"
      }
    }
    return 'bg-red-200 text-red-900'; // Red for "Follow Up Needed"
  }
  
  return 'bg-blue-100 text-blue-800'; // Default fallback
};

// Helper function to get a human-readable status label
const getStatusLabel = (status: ConversationStatus, date?: Date, isFromUs?: boolean): string => {
  switch (status) {
    case 'MEETING_BOOKED':
      return 'Meeting Booked';
    case 'NOT_INTERESTED':
      return 'Not Interested';
    case 'FOLLOW_UP_NEEDED':
      // Only apply conditional labeling if we have the date and it's from us
      if (date && isFromUs) {
        const days = daysSince(date);
        if (days < 3) {
          return 'Waiting for Reply';
        }
        return 'Follow Up Needed';
      }
      return 'Follow Up Needed';
    case 'NO_ACTION_NEEDED':
      return 'No Action Needed';
    default:
      return 'Unknown Status';
  }
};

// Helper for displaying message icons based on source
const getMessageIcon = (message: EmailMessage) => {
  if (message.messageSource === 'LINKEDIN') {
    return <LinkedInIcon className="h-5 w-5 text-blue-600" />;
  }
  return <MessageIcon className="h-5 w-5 text-slate-500" />;
};

// Add LinkedIn icon component
const LinkedInIcon: React.FC<LucideProps> = (props) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
      <rect x="2" y="9" width="4" height="12"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  );
};

// First, add a helper function to determine if a thread is a LinkedIn thread
const isLinkedInThread = (messages: EmailMessage[]): boolean => {
  return messages.some(msg => msg.messageSource === 'LINKEDIN');
};

// First, add a helper function to get LinkedIn sender names
// Add this near other helper functions at the top of the file

// Helper function to get LinkedIn sender name from ID
const getLinkedInSenderName = (senderId: string, message: EmailMessage, socialAccounts: SocialAccount[]): string => {
  // Simply return the sender name directly from the database
  // This is the value set when the message was created/received
  return message.sender;
};

// Helper function to format date in Central Time
const formatStoredDate = formatDateInCentralTime;

export function UniversalInboxClient() {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReplyModal, setShowReplyModal] = useState(false);
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

  // Group messages by thread and sort them
  const threadGroups = messages.reduce((groups, message) => {
    if (!groups[message.threadId]) {
      groups[message.threadId] = [];
    }
    groups[message.threadId].push(message);
    return groups;
  }, {} as Record<string, EmailMessage[]>);

  // Sort threads by latest message date
  const sortedThreadIds = Object.keys(threadGroups).sort((a, b) => {
    const aMessages = threadGroups[a];
    const bMessages = threadGroups[b];
    
    // Get latest message from each thread
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
    
    // Sort in descending order (newest first)
    return new Date(bLatest.receivedAt).getTime() - new Date(aLatest.receivedAt).getTime();
  });

  const hasMessages = Object.keys(threadGroups).length > 0;

  // Navigate to thread detail view
  const openThread = (threadId: string) => {
    setSelectedThread(threadId);
    setViewMode('detail');
  };

  // Navigate back to list view
  const backToList = () => {
    setViewMode('list');
  };

  // Fetch messages and email accounts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [messagesResponse, emailAccountsResponse, socialAccountsResponse] = await Promise.all([
          fetch('/api/messages'),
          fetch('/api/email-accounts'),
          fetch('/api/social-accounts')
        ]);
        
        if (!messagesResponse.ok || !emailAccountsResponse.ok || !socialAccountsResponse.ok) 
          throw new Error('Failed to fetch data');
        
        const [messages, emailAccounts, socialAccounts] = await Promise.all([
          messagesResponse.json(),
          emailAccountsResponse.json(),
          socialAccountsResponse.json()
        ]);
        
        // Debug log to check status values
        console.log('Messages with status:', messages.map((m: EmailMessage) => ({ 
          id: m.id, 
          threadId: m.threadId, 
          status: m.status,
          receivedAt: m.receivedAt,
          messageSource: m.messageSource,
          socialAccountId: m.socialAccountId
        })));
        
        console.log('Social accounts:', socialAccounts);
        
        setMessages(messages);
        setEmailAccounts(emailAccounts);
        setSocialAccounts(socialAccounts);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Helper function to check if a message is from us
  const isOurEmail = (sender: string, message?: EmailMessage) => {
    // For LinkedIn messages, check against social account names
    if (message?.messageSource === 'LINKEDIN') {
      return socialAccounts.some(account => account.name === sender);
    }
    // For email messages, check against email accounts
    return emailAccounts.some(account => account.email === sender);
  };

  // Helper function to find the other participant in a thread
  const findOtherParticipant = (messages: EmailMessage[]) => {
    // Sort messages by date (oldest first) to find the original conversation
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
    );

    // First try to find the original recipient if we started the thread
    const firstMessage = sortedMessages[0];
    if (isOurEmail(firstMessage.sender, firstMessage)) {
      return firstMessage.recipientEmail;
    }

    // Otherwise, use the first sender who isn't us
    const externalParticipant = sortedMessages.find(
      msg => !isOurEmail(msg.sender, msg)
    );
    if (externalParticipant) {
      return externalParticipant.sender;
    }

    // Fallback to the original recipient (shouldn't reach here in normal cases)
    return firstMessage.recipientEmail;
  };

  // Update the useEffect that handles pre-selection
  useEffect(() => {
    if (showReplyModal && selectedThread && threadGroups[selectedThread]) {
      const messages = threadGroups[selectedThread];
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
  }, [showReplyModal, selectedThread, emailAccounts, socialAccounts, threadGroups]);

  // Filter visible accounts for UI display
  const visibleEmailAccounts = emailAccounts.filter(account => !account.isHidden);

  const handleReply = async () => {
    if (!selectedThread) return;
    
    const threadMessages = threadGroups[selectedThread];
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

      // Get the correct recipient (the other participant in the thread)
      const toAddress = findOtherParticipant(threadMessages);

      // Find the original message in the thread (the first message)
      const originalMessage = threadMessages.sort((a, b) => 
        new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
      )[0];

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

      // Show appropriate success message based on message type
      toast.success(isLinkedIn ? 'LinkedIn reply sent successfully' : 'Email reply sent successfully');
      
      setShowReplyModal(false);
      setReplyContent('');
      setViewMode('list');
      
      // Reset selected accounts
      if (isLinkedIn) {
        setSelectedSocialAccount('');
      } else {
        setSelectedFromEmail('');
      }
      
      // Refresh messages
      const messagesResponse = await fetch('/api/messages');
      if (!messagesResponse.ok) throw new Error('Failed to fetch messages');
      const messages = await messagesResponse.json();
      setMessages(messages);
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
      setViewMode('list'); // Return to list view after status update
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
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
          <div className="flex justify-between items-center">
            <PageHeader
              title="Universal Inbox"
              description="View and manage all your email communications in one place."
            />
          </div>
        </div>

        {viewMode === 'list' ? (
          // List View (Full Width)
          <ClientCard className="h-[calc(100vh-14rem)] overflow-hidden flex flex-col border-slate-200/60 shadow-lg shadow-slate-200/50">
            <div className="px-6 py-4 border-b border-slate-200/60 flex items-center justify-between bg-white/95">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                <InboxIcon className="h-5 w-5 text-slate-500" />
                <span>Conversations</span>
              </h2>
            </div>
            
            {hasMessages ? (
              <div className="divide-y divide-slate-200/60 overflow-y-auto flex-1">
                {sortedThreadIds.map(threadId => {
                  const messages = threadGroups[threadId];
                  const latestMessage = messages.reduce((latest, msg) => {
                    const msgDate = new Date(msg.receivedAt);
                    const latestDate = new Date(latest.receivedAt);
                    return msgDate.getTime() > latestDate.getTime() ? msg : latest;
                  }, messages[0]);
                  
                  const isLatestFromUs = isOurEmail(latestMessage.sender, latestMessage);
                  const needsResponse = !isLatestFromUs && !latestMessage.isRead;
                  const isLinkedIn = latestMessage.messageSource === 'LINKEDIN';

                  // More robust status determination
                  let status: ConversationStatus;
                  if (latestMessage.status === 'MEETING_BOOKED' || latestMessage.status === 'NOT_INTERESTED' || latestMessage.status === 'NO_ACTION_NEEDED') {
                    // Always respect these manually set statuses
                    status = latestMessage.status;
                  } else {
                    // Default to FOLLOW_UP_NEEDED if no status or it's already FOLLOW_UP_NEEDED
                    status = 'FOLLOW_UP_NEEDED';
                  }
                  
                  const statusColor = getStatusColor(status, new Date(latestMessage.receivedAt), isLatestFromUs);
                  const rowStyle = getStatusRowStyle(status, new Date(latestMessage.receivedAt), isLatestFromUs);
                  
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
                            {isLinkedIn && <LinkedInIcon className="h-4 w-4 text-blue-600" />}
                            {isLinkedIn 
                              ? getLinkedInSenderName(latestMessage.sender, latestMessage, socialAccounts)
                              : findOtherParticipant(messages)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {formatStoredDate(latestMessage.receivedAt)}
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
                            statusColor
                          )}>
                            {getStatusLabel(status, new Date(latestMessage.receivedAt), isLatestFromUs)}
                          </span>
                          
                          {status === 'FOLLOW_UP_NEEDED' && isLatestFromUs && daysSince(new Date(latestMessage.receivedAt)) > 0 && (
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
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-slate-600">No messages found.</p>
              </div>
            )}
          </ClientCard>
        ) : (
          // Detail View (Full Width)
          <ClientCard className="h-[calc(100vh-14rem)] overflow-hidden flex flex-col border-slate-200/60 shadow-lg shadow-slate-200/50">
            <div className="px-6 py-4 border-b border-slate-200/60 flex justify-between items-center bg-white/95">
              <div className="flex items-center gap-4">
                <ClientButton 
                  variant="ghost" 
                  size="sm"
                  className="text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                  onClick={backToList}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  <span>Back</span>
                </ClientButton>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedThread ? findOtherParticipant(threadGroups[selectedThread]) : ''}
                </h2>
              </div>
              <div className="flex gap-2 items-center">
                {/* Status update buttons group */}
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
                    className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
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

                {/* Divider */}
                <div className="h-8 w-px bg-slate-200 mx-2"></div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <ClientButton 
                    variant="outline" 
                    size="sm"
                    className="text-blue-600 border-blue-300 hover:text-blue-800 hover:bg-blue-50"
                    onClick={() => setShowReplyModal(true)}
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
                      const latestMessage = threadGroups[selectedThread].sort((a, b) => 
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
                {selectedThread && threadGroups[selectedThread] && 
                 isLinkedInThread(threadGroups[selectedThread]) && (
                  <div className="flex items-center justify-end border-b border-gray-200 p-4">
                    <button
                      className="flex items-center space-x-1 rounded bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600"
                      onClick={() => {
                        // Get the first message of the thread 
                        const messages = threadGroups[selectedThread];
                        const message = messages[0]; // Use the first message in the thread
                        
                        // Find the correct social account to get the Unipile account ID
                        const socialAccount = socialAccounts.find(acc => acc.id === message.socialAccountId);
                        const unipileAccountId = socialAccount?.unipileAccountId || '';
                        
                        toast.info("Retrieving full chat history...");
                        fetch("https://messagelm.app.n8n.cloud/webhook/linkedin-conversation", {
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
                  {threadGroups[selectedThread]
                    .sort((a, b) => {
                      const aDate = new Date(a.receivedAt);
                      const bDate = new Date(b.receivedAt);
                      return aDate.getTime() - bDate.getTime();
                    })
                    .map((message, index, array) => {
                      const isFromUs = isOurEmail(message.sender, message);
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
                            <div>
                              <p className="font-medium text-slate-900 flex items-center gap-1">
                                {isLinkedIn && <LinkedInIcon className="h-4 w-4 text-blue-600" />}
                                {isLinkedIn 
                                  ? getLinkedInSenderName(message.sender, message, socialAccounts)
                                  : message.sender}
                              </p>
                              {!isLinkedIn && message.recipientEmail && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                  to {message.recipientEmail}
                                </p>
                              )}
                              {isLinkedIn && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                  via LinkedIn
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm text-slate-500">
                                {formatStoredDate(message.receivedAt)}
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
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[800px] max-h-[80vh] flex flex-col shadow-xl border border-slate-200/60">
            <div className="px-6 py-4 border-b border-slate-200/60 flex justify-between items-center bg-white/95">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                {selectedThread && threadGroups[selectedThread] && 
                 isLinkedInThread(threadGroups[selectedThread]) ? (
                  <>
                    <LinkedInIcon className="h-5 w-5 text-blue-600" />
                    <span>Reply to LinkedIn Message</span>
                  </>
                ) : (
                  <>
                    <ReplyIcon className="h-5 w-5 text-slate-500" />
                    <span>Reply</span>
                  </>
                )}
              </h2>
              <button 
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyContent('');
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 flex-1">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  From
                </label>
                {selectedThread && threadGroups[selectedThread] && 
                 isLinkedInThread(threadGroups[selectedThread]) ? (
                  <select
                    value={selectedSocialAccount}
                    onChange={(e) => setSelectedSocialAccount(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    onChange={(e) => setSelectedFromEmail(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply here..."
                className="w-full h-[300px] p-4 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-200/60 flex justify-end gap-3">
              <ClientButton
                variant="outline"
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyContent('');
                }}
              >
                Cancel
              </ClientButton>
              <ClientButton
                onClick={handleReply}
                disabled={
                  !replyContent.trim() || 
                  replying || 
                  (isLinkedInThread(threadGroups[selectedThread || '']) ? !selectedSocialAccount : !selectedFromEmail)
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
          </div>
        </div>
      )}

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