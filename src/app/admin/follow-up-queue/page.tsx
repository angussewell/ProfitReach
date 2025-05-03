'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { ClientCard, ClientButton } from '@/components/ui/client-components';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, RefreshCw, ChevronLeft, ChevronRight, 
  Inbox, Reply, Trash2, Calendar, ThumbsDown, 
  CheckCircle, Sparkles, Send 
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ConversationStatus } from '@prisma/client';
import { formatDateInCentralTime } from '@/lib/date-utils';
import { ConversationThreadView } from '@/components/admin/ConversationThreadView';
import { getStatusColor, getStatusLabel } from '@/lib/email/utils'; // Corrected import path
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AISuggestionPanel } from '@/components/shared/AISuggestionPanel'; // Import the new component

// Interface for queue items from API
interface FollowUpQueueItem {
  id: string; 
  messageId: string;
  threadId: string;
  organizationId: string;
  emailAccountId: string;
  subject: string;
  sender: string;
  recipientEmail: string;
  content: string;
  receivedAt: string;
  status: ConversationStatus;
  organizationName?: string;
  messageSource?: 'EMAIL' | 'LINKEDIN';
  socialAccountId?: string;
  aiSuggestion1?: string;
  aiSuggestion2?: string;
  aiSuggestion3?: string;
}

// Interface for the full EmailMessage object
interface FullEmailMessage {
  id: string;
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  recipientEmail: string;
  content: string;
  receivedAt: string;
  messageType: 'REAL_REPLY' | 'BOUNCE' | 'AUTO_REPLY' | 'OUT_OF_OFFICE' | 'OTHER';
  isRead: boolean;
  status?: ConversationStatus | null;
  messageSource?: 'EMAIL' | 'LINKEDIN';
  socialAccountId?: string | null;
  organizationId?: string;
  emailAccountId?: string | null;
  aiSuggestion1?: string | null;
  aiSuggestion2?: string | null;
  aiSuggestion3?: string | null;
}

// Interfaces for accounts
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

export default function AdminFollowUpQueuePage() {
  // Auth check
  const { data: session, status } = useSession();
  
  // Redirect if not admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      redirect('/');
    }
  }, [session, status]);

  // State for the queue items and current position
  const [queueItems, setQueueItems] = useState<FollowUpQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Thread details
  const [currentThreadMessages, setCurrentThreadMessages] = useState<FullEmailMessage[] | null>(null);
  const [isThreadLoading, setIsThreadLoading] = useState<boolean>(false);

  // Account info
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);

  // State for reply functionality
  const [isReplying, setIsReplying] = useState<boolean>(false);
  const [replyContent, setReplyContent] = useState<string>('');
  const [selectedFromEmail, setSelectedFromEmail] = useState<string>('');
  const [selectedSocialAccount, setSelectedSocialAccount] = useState<string>('');
  const [replyLoading, setReplyLoading] = useState<boolean>(false);
  const userSelectedEmailRef = useRef<boolean>(false);
  const replyCardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Status update state
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Ref for the scrollable thread container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // State for displayed AI suggestions
  const [displayedSuggestions, setDisplayedSuggestions] = useState<{ s1: string | null, s2: string | null, s3: string | null }>({ s1: null, s2: null, s3: null });

  // Current thread ID getter based on the current index
  const currentThreadId = queueItems.length > 0 && currentIndex >= 0 && currentIndex < queueItems.length 
    ? queueItems[currentIndex].threadId 
    : null;

  // Fetch queue items, email accounts, and social accounts
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [queueResponse, emailAccountsResponse, socialAccountsResponse] = await Promise.all([
        fetch('/api/admin/follow-up-queue'),
        fetch('/api/email-accounts'),
        fetch('/api/social-accounts')
      ]);

      if (!queueResponse.ok) throw new Error(`API Error (Queue): ${queueResponse.status}`);
      const queueData: FollowUpQueueItem[] = await queueResponse.json();
      setQueueItems(queueData);
      
      // Reset index to 0 when fetching new data
      setCurrentIndex(0);

      if (!emailAccountsResponse.ok) throw new Error(`API Error (Email Accounts): ${emailAccountsResponse.status}`);
      const emailAccountsData: EmailAccount[] = await emailAccountsResponse.json();
      setEmailAccounts(emailAccountsData);

      if (!socialAccountsResponse.ok) throw new Error(`API Error (Social Accounts): ${socialAccountsResponse.status}`);
      const socialAccountsData: SocialAccount[] = await socialAccountsResponse.json();
      setSocialAccounts(socialAccountsData);

      // Get thread details for the first item if available
      if (queueData.length > 0) {
        fetchThreadDetails(queueData[0].threadId);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch initial data');
      setQueueItems([]);
      setEmailAccounts([]);
      setSocialAccounts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Function to fetch full thread details
  const fetchThreadDetails = useCallback(async (threadId: string) => {
    if (!threadId) return;
    
    setIsThreadLoading(true);
    setCurrentThreadMessages(null);
    
    try {
      const response = await fetch(`/api/messages/thread/${threadId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse thread error' }));
        toast.error(errorData.error || `API Error (Thread ${response.status})`);
        throw new Error(errorData.error || `API Error fetching thread: ${response.status}`);
      }
      const threadData: FullEmailMessage[] = await response.json();
      setCurrentThreadMessages(threadData);
    } catch (error) {
      console.error(`Error fetching thread details for ${threadId}:`, error);
      toast.error('Failed to load thread details');
    } finally {
      setIsThreadLoading(false);
    }
  }, []);

  // Fetch initial data on mount
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]); // Keep fetchInitialData dependency

  // Effect to update displayed suggestions when the current thread changes
  useEffect(() => {
    if (currentThreadMessages && currentThreadMessages.length > 0) {
      const latest = currentThreadMessages.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())[0];
      setDisplayedSuggestions({
        s1: latest.aiSuggestion1 ?? null,
        s2: latest.aiSuggestion2 ?? null,
        s3: latest.aiSuggestion3 ?? null,
      });
      console.log('[FollowUpQueue] Updated displayed suggestions from latest message.');
    } else {
      // Clear suggestions if no messages are loaded
      setDisplayedSuggestions({ s1: null, s2: null, s3: null });
      console.log('[FollowUpQueue] Cleared displayed suggestions.');
    }
  }, [currentThreadMessages]); // Depend only on currentThreadMessages

  // LayoutEffect to scroll WINDOW to top when thread changes (runs SYNCHRONOUSLY after DOM mutations)
  useLayoutEffect(() => {
    // Scroll the main window to the top instantly when the thread ID changes.
    // This ensures the scroll happens *before* the browser paints the update.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    console.log('[FollowUpQueue] Scrolled window to top.');
    
    // Keep the container scroll attempt as a backup, though window scroll should suffice
    // if (scrollContainerRef.current) {
    //   scrollContainerRef.current.scrollTop = 0;
    // }
  }, [currentThreadId]); // Dependency: run when the thread ID changes

  // Effect to auto-select 'From' account when reply opens
  useEffect(() => {
    // Only run when reply section opens AND user hasn't manually selected
    if (isReplying && currentThreadMessages && currentThreadMessages.length > 0 && !userSelectedEmailRef.current) {
      const latestMessage = currentThreadMessages.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())[0];
      
      // Handle Email auto-selection
      if (!isLinkedInMessage(latestMessage)) {
        const initialFromAccount = emailAccounts.find(a => a.id === latestMessage.emailAccountId) ?? 
                                   emailAccounts.find(a => a.email === latestMessage.sender) ?? 
                                   null;
        
        if (initialFromAccount) {
          console.log('[FollowUpQueue] Auto-selecting From email:', initialFromAccount.email);
          setSelectedFromEmail(initialFromAccount.email);
        } else {
          console.log('[FollowUpQueue] No matching From email found for auto-selection.');
          setSelectedFromEmail(''); // Ensure it's blank if no match
        }
      } 
      // LinkedIn selection might already be handled or needs similar logic if not
      // For now, focusing on email as per requirement.
      
    } else if (!isReplying) {
      // Reset the flag when the reply section closes
      userSelectedEmailRef.current = false;
      // Optionally reset selected emails/accounts here too if desired
      // setSelectedFromEmail('');
      // setSelectedSocialAccount('');
    }
  }, [isReplying, currentThreadMessages, emailAccounts, socialAccounts]); // Add dependencies

  // Helper to check if message is LinkedIn
  const isLinkedInMessage = (message: FollowUpQueueItem | FullEmailMessage | null): boolean => {
    return message?.messageSource === 'LINKEDIN';
  };

  // Navigation to the previous thread
  const handlePreviousThread = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      fetchThreadDetails(queueItems[newIndex].threadId);
      setIsReplying(false);
      setReplyContent('');
    }
  };

  // Navigation to the next thread
  const handleNextThread = () => {
    if (currentIndex < queueItems.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      fetchThreadDetails(queueItems[newIndex].threadId);
      setIsReplying(false);
      setReplyContent('');
    }
  };

  // Callback for AISuggestionPanel to update suggestions state AND navigate
  // Moved definition after handleNextThread to resolve dependency issue
  const handleSuggestionsUpdate = useCallback((newSuggestions: { s1: string | null, s2: string | null, s3: string | null }) => {
    setDisplayedSuggestions(newSuggestions);
    toast.success("AI suggestions updated!"); 
    console.log('[FollowUpQueue] Received updated suggestions from panel, advancing to next thread:', newSuggestions);
    // Advance to the next thread after successful regeneration
    handleNextThread(); 
  }, [handleNextThread]); // Dependency is now defined above

  // Handle refreshing the queue
  const handleRefresh = () => {
    setRefreshing(true);
    fetchInitialData();
  };

  // Update status of the current thread
  const handleStatusUpdate = async (newStatus: ConversationStatus) => {
    if (!currentThreadId || actionLoading) return;
    
    const currentItem = queueItems[currentIndex];
    
    setActionLoading(true);
    
    try {
      // Update status via API
      const response = await fetch('/api/messages/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentItem.id, status: newStatus }),
      });
      
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      toast.success(`Status updated to ${getStatusLabel(newStatus)}`);
      
      // --- Refined logic similar to handleDelete ---
      const updatedIndex = currentIndex;
      let nextThreadIdToLoad: string | null = null;

      // Update queue items state and determine the next index
      setQueueItems(prev => {
        const newQueueItems = prev.filter((_, idx) => idx !== updatedIndex);
        
        if (newQueueItems.length === 0) {
          // Queue is now empty
          setCurrentIndex(0); 
          setCurrentThreadMessages(null); 
          console.log('[FollowUpQueue] Queue empty after status update.');
        } else {
          // Determine the index of the next item to show
          const nextIndex = Math.min(updatedIndex, newQueueItems.length - 1);
          setCurrentIndex(nextIndex);
          nextThreadIdToLoad = newQueueItems[nextIndex].threadId;
          console.log(`[FollowUpQueue] Status updated for item at index ${updatedIndex}, next index is ${nextIndex}`);
        }
        return newQueueItems; // Return the updated list
      });

      // Fetch the next thread details *after* state update
      if (nextThreadIdToLoad) {
        console.log(`[FollowUpQueue] Fetching details for next thread after status update: ${nextThreadIdToLoad}`);
        fetchThreadDetails(nextThreadIdToLoad);
      }
      
      // Reset reply state regardless
      setIsReplying(false);
      setReplyContent('');
      // --- End refined logic ---

    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle message deletion
  const handleDelete = async () => {
    if (!currentThreadId || actionLoading) return;
    
    const currentItem = queueItems[currentIndex];
    
    setActionLoading(true);
    
    if (!confirm(`Are you sure you want to delete the latest message in this thread?\nSubject: ${currentItem.subject}\nFrom: ${currentItem.sender}`)) {
      setActionLoading(false);
      return;
    }
    
    try {
      // Delete the message via API
      const response = await fetch(`/api/messages/${currentItem.id}`, { method: 'DELETE' });
      
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      toast.success('Message deleted');
      
      // --- Refined logic to handle state update and navigation ---
      const deletedIndex = currentIndex;
      let nextThreadIdToLoad: string | null = null;
      
      // Update queue items state and determine the next index
      setQueueItems(prev => {
        const newQueueItems = prev.filter((_, idx) => idx !== deletedIndex);
        
        if (newQueueItems.length === 0) {
          // Queue is now empty
          setCurrentIndex(0); // Reset index
          setCurrentThreadMessages(null); // Clear details
          console.log('[FollowUpQueue] Queue empty after deletion.');
        } else {
          // Determine the index of the next item to show
          const nextIndex = Math.min(deletedIndex, newQueueItems.length - 1);
          setCurrentIndex(nextIndex);
          nextThreadIdToLoad = newQueueItems[nextIndex].threadId;
          console.log(`[FollowUpQueue] Deleted item at index ${deletedIndex}, next index is ${nextIndex}`);
        }
        return newQueueItems; // Return the updated list
      });

      // Fetch the next thread details *after* state update (using the ID determined above)
      if (nextThreadIdToLoad) {
        console.log(`[FollowUpQueue] Fetching details for next thread: ${nextThreadIdToLoad}`);
        fetchThreadDetails(nextThreadIdToLoad);
      }
      
      // Reset reply state regardless
      setIsReplying(false);
      setReplyContent('');
      // --- End refined logic ---

    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete message');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle sending a reply
  const handleReply = async () => {
    if (!currentThreadId || !currentThreadMessages || currentThreadMessages.length === 0 || !replyContent.trim() || replyLoading) return;
    
    const isLinkedIn = currentThreadMessages.some(msg => msg.messageSource === 'LINKEDIN');
    
    if ((isLinkedIn && !selectedSocialAccount) || (!isLinkedIn && !selectedFromEmail)) {
      toast.error(`Please select ${isLinkedIn ? 'a LinkedIn' : 'an email'} account to reply from.`);
      return;
    }
    
    setReplyLoading(true);
    
    try {
      const latestMessage = currentThreadMessages.sort((a, b) => 
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      )[0];
      
      const toAddress = latestMessage.sender;
      let fromEmailForApi = '';
      let socialAccountIdForApi: string | undefined = undefined;
      
      if (isLinkedIn) {
        const socialAccount = socialAccounts.find(acc => acc.id === selectedSocialAccount);
        if (!socialAccount) throw new Error('Selected LinkedIn account not found.');
        
        const integrationAccount = emailAccounts.find(acc => 
          acc.id === socialAccount.emailAccountId || acc.email.includes('linkedin-integration')
        );
        
        if (!integrationAccount) throw new Error('LinkedIn integration account not found.');
        
        fromEmailForApi = integrationAccount.email;
        socialAccountIdForApi = socialAccount.id;
      } else {
        fromEmailForApi = selectedFromEmail;
      }
      
      const requestBody = {
        messageId: latestMessage.messageId,
        content: replyContent,
        action: 'reply',
        fromEmail: fromEmailForApi,
        toAddress,
        ...(socialAccountIdForApi && { socialAccountId: socialAccountIdForApi })
      };
      
      const response = await fetch('/api/messages/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) throw new Error(`API Error (Reply): ${response.status}`);
      
      toast.success(isLinkedIn ? 'LinkedIn reply sent' : 'Email reply sent');
      
      // Reset reply state *before* navigating
      setIsReplying(false);
      setReplyContent('');
      
      // Automatically advance to the next thread after successful send
      console.log('[FollowUpQueue] Reply successful, advancing to next thread.');
      handleNextThread(); 
      
      // Note: We are intentionally NOT calling handleStatusUpdate here anymore.
      // N8n webhook is expected to handle status updates based on the reply.
      
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  // Loading state
  if (loading && status === 'loading') {
    return (
      <PageContainer>
        <PageHeader
          title="Admin Follow-Up Queue"
          description="Review threads needing follow-up"
        />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      </PageContainer>
    );
  }

  // Show message if not authenticated as admin
  if (status === 'unauthenticated' || (status === 'authenticated' && session?.user?.role !== 'admin')) {
    return (
      <PageContainer>
        <PageHeader
          title="Admin Follow-Up Queue"
          description="Review threads needing follow-up"
        />
        <ClientCard className="p-8 text-center border-slate-200/60 shadow-lg shadow-slate-200/50">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Access Denied</h3>
          <p className="text-slate-600">This page is only accessible to administrators.</p>
        </ClientCard>
      </PageContainer>
    );
  }

  // Main content
  return (
    <PageContainer>
      <PageHeader
        title="Admin Follow-Up Queue"
        description={`Review threads needing follow-up (${queueItems.length} total)`}
      />

      {/* Empty State */}
      {queueItems.length === 0 ? (
        <ClientCard className="p-8 text-center border-slate-200/60 shadow-lg shadow-slate-200/50">
          <Inbox className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">All Caught Up!</h3>
          <p className="text-slate-600">There are no threads currently needing follow-up.</p>
          <ClientButton onClick={handleRefresh} className="mt-4" disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh Queue
          </ClientButton>
        </ClientCard>
      ) : (
        <ClientCard className="border-slate-200/60 shadow-lg shadow-slate-200/50">
          {/* Header with Navigation */}
          <div className="flex justify-between items-center border-b border-slate-200/60 p-4">
            <div className="flex items-center gap-2">
              <ClientButton
                variant="ghost"
                size="sm"
                onClick={handlePreviousThread}
                disabled={currentIndex <= 0 || actionLoading}
                className="flex-shrink-0"
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                <span>Previous</span>
              </ClientButton>
              <ClientButton
                variant="ghost"
                size="sm"
                onClick={handleNextThread}
                disabled={currentIndex >= queueItems.length - 1 || actionLoading}
                className="flex-shrink-0"
              >
                <span>Next</span>
                <ChevronRight className="h-5 w-5 ml-1" />
              </ClientButton>
              <div className="px-2 py-1 ml-2 text-xs text-slate-500 bg-slate-100 rounded-md">
                {currentIndex + 1} of {queueItems.length}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <ClientButton
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex-shrink-0"
              >
                {refreshing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                <span>Refresh</span>
              </ClientButton>
              <div className="flex bg-slate-50 rounded-md p-1 gap-1">
                <ClientButton 
                  variant="ghost" 
                  size="sm"
                  className="text-green-600 hover:text-green-800 hover:bg-green-50"
                  onClick={() => handleStatusUpdate(ConversationStatus.MEETING_BOOKED)}
                  disabled={actionLoading || !currentThreadId}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Booked</span>
                </ClientButton>
                <ClientButton 
                  variant="ghost" 
                  size="sm"
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  onClick={() => handleStatusUpdate(ConversationStatus.NOT_INTERESTED)}
                  disabled={actionLoading || !currentThreadId}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  <span>Not Interested</span>
                </ClientButton>
                <ClientButton 
                  variant="ghost" 
                  size="sm"
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                  onClick={() => handleStatusUpdate(ConversationStatus.NO_ACTION_NEEDED)}
                  disabled={actionLoading || !currentThreadId}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>No Action</span>
                </ClientButton>
              </div>
              <ClientButton 
                variant="outline" 
                size="sm"
                onClick={() => setIsReplying(prev => !prev)}
                disabled={actionLoading || !currentThreadId}
              >
                <Reply className="h-4 w-4 mr-1" />
                <span>{isReplying ? 'Hide Reply' : 'Reply'}</span>
              </ClientButton>
              <ClientButton 
                variant="outline" 
                size="sm"
                className="text-red-600 border-red-300 hover:text-red-800 hover:bg-red-50"
                onClick={handleDelete}
                disabled={actionLoading || !currentThreadId}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                <span>Delete</span>
              </ClientButton>
            </div>
          </div>

          {/* Thread Content - Assign ref to the scrollable container */}
          <div 
            ref={scrollContainerRef} 
            className="p-6 overflow-y-auto" 
            style={{ maxHeight: 'calc(100vh - 220px)' }}
          >
            {isThreadLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              </div>
            ) : !currentThreadId ? (
              <p className="text-center text-slate-500 p-6">No thread selected.</p>
            ) : !currentThreadMessages ? (
              <p className="text-center text-slate-500 p-6">Could not load thread details.</p>
            ) : (
              <>
                {/* Thread View */}
                <ConversationThreadView
                  messages={currentThreadMessages}
                  emailAccounts={emailAccounts}
                  socialAccounts={socialAccounts}
                  className="mb-6"
                />

                {/* Reply Section */}
                {isReplying && (
                  <div ref={replyCardRef} className="border-t border-slate-200/60 bg-slate-50/50 p-6 rounded-b-lg mt-6">
                    <div className="space-y-4 max-w-4xl mx-auto">
                      <h3 className="text-lg font-medium text-slate-800">Reply</h3>
                      
                      {/* From Select */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
                        {currentThreadMessages && isLinkedInMessage(currentThreadMessages[0]) ? (
                          <Select
                            value={selectedSocialAccount}
                            onValueChange={(value) => { 
                              setSelectedSocialAccount(value); 
                              userSelectedEmailRef.current = true; 
                            }}
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Select LinkedIn account..." />
                            </SelectTrigger>
                            <SelectContent>
                              {socialAccounts
                                .filter(acc => acc.provider === 'LINKEDIN' && acc.isActive)
                                .map(account => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {account.name} ({account.username})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select
                            value={selectedFromEmail}
                            onValueChange={(value) => { 
                              setSelectedFromEmail(value); 
                              userSelectedEmailRef.current = true; 
                            }}
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Select email account..." />
                            </SelectTrigger>
                            <SelectContent>
                              {emailAccounts
                                .filter(acc => !acc.isHidden)
                                .map(account => (
                                  <SelectItem key={account.id} value={account.email}>
                                    {account.name} ({account.email})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      
                      {/* To Display */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
                        <div className="text-sm text-slate-900 border border-slate-300 rounded-md p-2 bg-white/50 h-[40px] flex items-center">
                          {currentThreadMessages.length > 0 
                            ? currentThreadMessages.sort((a, b) => 
                                new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
                              )[0].sender 
                            : ''
                          }
                        </div>
                      </div>
                      
                      {/* Textarea */}
                      <div>
                        <label htmlFor="replyTextArea" className="sr-only">Reply Content</label>
                        <Textarea
                          ref={textareaRef}
                          id="replyTextArea"
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Type your reply here..."
                          className="w-full h-[20vh] p-3 border border-slate-300 rounded-lg resize-y whitespace-pre-wrap bg-white text-slate-900"
                        />
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex justify-end gap-3">
                        <ClientButton 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setIsReplying(false)} 
                          disabled={replyLoading}
                        >
                          Cancel
                        </ClientButton>
                        
                        <ClientButton 
                          size="sm" 
                          onClick={handleReply} 
                          disabled={!replyContent.trim() || replyLoading || (isLinkedInMessage(currentThreadMessages[0]) ? !selectedSocialAccount : !selectedFromEmail)}
                          className="flex items-center gap-2"
                        >
                          {replyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          {replyLoading ? 'Sending...' : 'Send Reply'}
                        </ClientButton>
                      </div>

                      {/* AI Suggestion Panel Integration */}
                      <AISuggestionPanel
                        // Find the latest message from the current thread
                        latestMessage={
                          currentThreadMessages && currentThreadMessages.length > 0
                            ? currentThreadMessages.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())[0]
                            : null
                        }
                        // Pass the suggestions from state for display
                        suggestions={displayedSuggestions}
                        // Pass the function to update the reply textarea content
                        onUseSuggestion={setReplyContent}
                        // Pass the callback to update suggestions state
                        onSuggestionsUpdated={handleSuggestionsUpdate}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ClientCard>
      )}
    </PageContainer>
  );
}
