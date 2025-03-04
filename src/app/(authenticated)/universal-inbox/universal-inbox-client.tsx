'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { ClientCard, ClientButton, ClientInput } from '@/components/ui/client-components';
import { Inbox, Loader2, MessageSquare, Reply, Send, Trash2, X, Calendar, ThumbsDown, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideProps } from 'lucide-react';
import { toast } from 'sonner';
import { updateMessageStatus } from '@/lib/server-actions';

type MessageType = 'REAL_REPLY' | 'BOUNCE' | 'AUTO_REPLY' | 'OUT_OF_OFFICE' | 'OTHER';
type ConversationStatus = 'MEETING_BOOKED' | 'NOT_INTERESTED' | 'FOLLOW_UP_NEEDED' | 'NO_ACTION_NEEDED';

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
}

// Define email account interface
interface EmailAccount {
  id: string;
  email: string;
  name: string;
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
  
  // For FOLLOW_UP_NEEDED, color depends on days passed
  if (isFromUs) {
    const days = daysSince(latestMessageDate);
    if (days >= 3) {
      return style + 'border-red-600 bg-red-50/60'; // More pronounced red for ≥3 days
    }
  }
  
  return style + 'border-blue-300 bg-blue-50/30'; // Blue for <3 days or not from us
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
  
  // For FOLLOW_UP_NEEDED, color depends on days passed
  if (isFromUs) {
    const days = daysSince(latestMessageDate);
    if (days >= 3) {
      return 'bg-red-200 text-red-900'; // More pronounced red for ≥3 days
    }
  }
  
  return 'bg-blue-100 text-blue-800'; // Blue for <3 days or not from us
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
  const [selectedFromEmail, setSelectedFromEmail] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

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
        const [messagesResponse, accountsResponse] = await Promise.all([
          fetch('/api/messages'),
          fetch('/api/email-accounts')
        ]);
        
        if (!messagesResponse.ok || !accountsResponse.ok) 
          throw new Error('Failed to fetch data');
        
        const [messages, accounts] = await Promise.all([
          messagesResponse.json(),
          accountsResponse.json()
        ]);
        
        // Debug log to check status values
        console.log('Messages with status:', messages.map((m: EmailMessage) => ({ 
          id: m.id, 
          threadId: m.threadId, 
          status: m.status,
          receivedAt: m.receivedAt
        })));
        
        setMessages(messages);
        setEmailAccounts(accounts);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Helper function to check if an email belongs to our accounts
  const isOurEmail = (email: string) => {
    return emailAccounts.some(account => account.email === email);
  };

  // Helper function to find the other participant in a thread
  const findOtherParticipant = (messages: EmailMessage[]) => {
    // Sort messages by date (oldest first) to find the original conversation
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
    );

    // First try to find the original recipient if we started the thread
    const firstMessage = sortedMessages[0];
    if (isOurEmail(firstMessage.sender)) {
      return firstMessage.recipientEmail;
    }

    // Otherwise, use the first sender who isn't us
    const externalParticipant = sortedMessages.find(
      msg => !isOurEmail(msg.sender)
    );
    if (externalParticipant) {
      return externalParticipant.sender;
    }

    // Fallback to the original recipient (shouldn't reach here in normal cases)
    return firstMessage.recipientEmail;
  };

  // Reset selected email when opening reply modal
  useEffect(() => {
    if (showReplyModal && selectedThread && emailAccounts.length > 0) {
      const messages = threadGroups[selectedThread];
      
      // Find our email account that was involved in the conversation
      const ourEmail = emailAccounts.find(account => 
        messages.some(msg => 
          msg.sender === account.email || msg.recipientEmail === account.email
        )
      );

      if (ourEmail) {
        setSelectedFromEmail(ourEmail.email);
      }
    }
  }, [showReplyModal, selectedThread, emailAccounts]);

  // Group messages by thread
  const threadGroups = messages.reduce((groups, message) => {
    if (!groups[message.threadId]) {
      groups[message.threadId] = [];
    }
    groups[message.threadId].push(message);
    return groups;
  }, {} as Record<string, EmailMessage[]>);

  const hasMessages = Object.keys(threadGroups).length > 0;

  const handleReply = async () => {
    if (!selectedThread || !replyContent.trim() || !selectedFromEmail) return;
    
    setReplying(true);
    try {
      const threadMessages = threadGroups[selectedThread];
      const latestMessage = threadMessages.sort((a, b) => 
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      )[0];

      // Find the selected email account
      const selectedAccount = emailAccounts.find(account => account.email === selectedFromEmail);
      if (!selectedAccount) {
        throw new Error('Please select a valid email account to send from');
      }

      // Get the correct recipient email (the other participant in the thread)
      const toAddress = findOtherParticipant(threadMessages);

      const response = await fetch('/api/messages/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: latestMessage.messageId,
          content: replyContent,
          action: 'reply',
          fromEmail: selectedFromEmail,
          toAddress
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reply');
      }

      toast.success('Reply sent successfully');
      setShowReplyModal(false);
      setReplyContent('');
      setViewMode('list');
      
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
                {Object.entries(threadGroups).map(([threadId, messages]) => {
                  const latestMessage = messages.sort((a, b) => 
                    new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
                  )[0];
                  
                  const isLatestFromUs = isOurEmail(latestMessage.sender);
                  const needsResponse = !isLatestFromUs && !latestMessage.isRead;

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
                          <div className="font-medium text-slate-900 truncate">
                            {findOtherParticipant(messages)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(latestMessage.receivedAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        
                        {/* Subject & Preview */}
                        <div className="col-span-7">
                          <div className="font-medium text-slate-800 truncate">
                            {latestMessage.subject}
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
                              daysSince(new Date(latestMessage.receivedAt)) >= 3 ? "bg-red-200 text-red-900" : 
                              "bg-blue-100 text-blue-800"
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
            
            {selectedThread ? (
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {threadGroups[selectedThread]
                  ?.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime())
                  .map((message, index, array) => {
                    const isFromUs = isOurEmail(message.sender);
                    const isLatestMessage = index === array.length - 1;
                    
                    // More robust status determination for the detail view
                    let status: ConversationStatus | undefined = undefined;
                    
                    if (isLatestMessage) {
                      if (message.status === 'MEETING_BOOKED' || message.status === 'NOT_INTERESTED' || message.status === 'NO_ACTION_NEEDED') {
                        // Always respect these manually set statuses
                        status = message.status;
                      } else {
                        // Default to FOLLOW_UP_NEEDED if no status or it's already FOLLOW_UP_NEEDED
                        status = 'FOLLOW_UP_NEEDED';
                      }
                    }
                    
                    return (
                      <div 
                        key={message.id} 
                        className={cn(
                          "rounded-xl border shadow-sm p-6 transition-all hover:shadow-md",
                          isFromUs ? "bg-blue-50/30 border-blue-200/60" : "bg-white border-slate-200/60",
                          isLatestMessage && status === 'MEETING_BOOKED' && "border-l-4 border-l-green-500 bg-green-50/30",
                          isLatestMessage && status === 'NOT_INTERESTED' && "border-l-4 border-l-gray-500 bg-gray-50/30",
                          isLatestMessage && status === 'NO_ACTION_NEEDED' && "border-l-4 border-l-blue-500 bg-blue-50/30",
                          isLatestMessage && status === 'FOLLOW_UP_NEEDED' && isFromUs && daysSince(new Date(message.receivedAt)) >= 3 && "border-l-4 border-l-red-600 bg-red-50/60",
                          isLatestMessage && status === 'FOLLOW_UP_NEEDED' && "border-l-4 border-l-blue-300 bg-blue-50/20"
                        )}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-medium text-slate-900">{message.sender}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              to {message.recipientEmail}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <span className="text-sm text-slate-500">
                              {new Date(message.receivedAt).toLocaleString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                            
                            {isLatestMessage && status === 'FOLLOW_UP_NEEDED' && isFromUs && daysSince(new Date(message.receivedAt)) > 0 && (
                              <span className={cn(
                                "ml-2 px-1.5 py-0.5 rounded text-xs font-medium",
                                daysSince(new Date(message.receivedAt)) >= 3 ? "bg-red-200 text-red-900" : 
                                "bg-blue-100 text-blue-800"
                              )}>
                                {daysSince(new Date(message.receivedAt))}d
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 text-sm text-slate-800 whitespace-pre-wrap" 
                             dangerouslySetInnerHTML={{ __html: message.content }} />
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-slate-100 rounded-full p-4 mb-4">
                  <MessageIcon className="h-8 w-8 text-slate-400" />
                </div>
                <p className="font-medium text-slate-900">Select a conversation</p>
                <p className="text-sm mt-2 text-slate-600 max-w-[280px]">
                  Choose a conversation from the list to view the full thread.
                </p>
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
                <ReplyIcon className="h-5 w-5 text-slate-500" />
                <span>Reply</span>
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
                <select
                  value={selectedFromEmail}
                  onChange={(e) => setSelectedFromEmail(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an email account</option>
                  {emailAccounts.map(account => (
                    <option 
                      key={account.id} 
                      value={account.email}
                    >
                      {account.email}
                    </option>
                  ))}
                </select>
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
                disabled={!replyContent.trim() || replying || !selectedFromEmail}
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