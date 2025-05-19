'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { ClientCard, ClientButton } from '@/components/ui/client-components';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Loader2, Search, RefreshCw, 
  Reply, Trash2, Calendar, ThumbsDown, 
  CheckCircle, Sparkles, Send 
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ConversationStatus } from '@prisma/client';
import { formatDateInCentralTime } from '@/lib/date-utils';
import { ConversationThreadView } from '@/components/admin/ConversationThreadView';
import { getStatusColor, getStatusLabel } from '@/lib/email/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AISuggestionPanel } from '@/components/shared/AISuggestionPanel';

// Interface for email messages
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

export default function AdminEmailSearchPage() {
  // Auth check
  const { data: session, status } = useSession();
  
  // Redirect if not admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      redirect('/');
    }
  }, [session, status]);

  // State for search input
  const [searchEmail, setSearchEmail] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // State for search results
  const [searchResults, setSearchResults] = useState<FullEmailMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Account info
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [replyEmailAccounts, setReplyEmailAccounts] = useState<EmailAccount[]>([]);

  // State for reply functionality
  const [isReplying, setIsReplying] = useState<boolean>(false);
  const [replyContent, setReplyContent] = useState<string>('');
  const [selectedFromEmail, setSelectedFromEmail] = useState<string>('');
  const [selectedSocialAccount, setSelectedSocialAccount] = useState<string>('');
  const [replyLoading, setReplyLoading] = useState<boolean>(false);
  const userSelectedEmailRef = useRef<boolean>(false);
  const [latestMessageRecipients, setLatestMessageRecipients] = useState<string[] | null>(null);
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState<string>('');
  const replyCardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Status update state
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // State for displayed AI suggestions
  const [displayedSuggestions, setDisplayedSuggestions] = useState<{ s1: string | null, s2: string | null, s3: string | null }>({ s1: null, s2: null, s3: null });

  // Fetch email accounts and social accounts on mount
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [emailAccountsResponse, socialAccountsResponse] = await Promise.all([
        fetch('/api/email-accounts'),
        fetch('/api/social-accounts')
      ]);

      if (!emailAccountsResponse.ok) throw new Error(`API Error (Email Accounts): ${emailAccountsResponse.status}`);
      const emailAccountsData: EmailAccount[] = await emailAccountsResponse.json();
      setEmailAccounts(emailAccountsData);

      if (!socialAccountsResponse.ok) throw new Error(`API Error (Social Accounts): ${socialAccountsResponse.status}`);
      const socialAccountsData: SocialAccount[] = await socialAccountsResponse.json();
      setSocialAccounts(socialAccountsData);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch initial data');
      setEmailAccounts([]);
      setSocialAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial data on mount
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Effect to update displayed suggestions when search results change
  useEffect(() => {
    if (searchResults && searchResults.length > 0) {
      const latest = searchResults.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())[0];
      setDisplayedSuggestions({
        s1: latest.aiSuggestion1 ?? null,
        s2: latest.aiSuggestion2 ?? null,
        s3: latest.aiSuggestion3 ?? null,
      });
      console.log('[EmailSearch] Updated displayed suggestions from latest message.');
    } else {
      // Clear suggestions if no messages are loaded
      setDisplayedSuggestions({ s1: null, s2: null, s3: null });
      console.log('[EmailSearch] Cleared displayed suggestions.');
    }
  }, [searchResults]);

  // Effect to auto-select 'From' account when reply opens
  useEffect(() => {
    if (isReplying && searchResults && searchResults.length > 0 && !userSelectedEmailRef.current && replyEmailAccounts.length > 0) {
      const latestMessage = searchResults.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())[0];

      if (!isLinkedInMessage(latestMessage)) {
        const initialFromAccount = replyEmailAccounts.find(a => a.id === latestMessage.emailAccountId) ??
                                   replyEmailAccounts.find(a => a.email === latestMessage.sender) ??
                                   null;

        if (initialFromAccount) {
          console.log('[EmailSearch] Auto-selecting From email:', initialFromAccount.email);
          setSelectedFromEmail(initialFromAccount.email);
        } else {
          console.log('[EmailSearch] No matching From email found for auto-selection.');
          setSelectedFromEmail('');
        }
      }
    } else if (!isReplying) {
      userSelectedEmailRef.current = false;
    }
  }, [isReplying, searchResults, replyEmailAccounts, socialAccounts]);

  // Helper to check if message is LinkedIn
  const isLinkedInMessage = (message: FullEmailMessage | null): boolean => {
    return message?.messageSource === 'LINKEDIN';
  };

  // Handle search submission
  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      toast.error('Please enter an email address to search');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const response = await fetch(`/api/admin/email-search?email=${encodeURIComponent(searchEmail.trim())}`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data: FullEmailMessage[] = await response.json();
      setSearchResults(data);
      
      if (data.length === 0) {
        toast.info('No emails found for this address');
      } else {
        toast.success(`Found ${data.length} email(s)`);
        
        // Set latest message recipients
        if (data.length > 0) {
          const latestMsg = [...data].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())[0];
          
          // Create recipients array
          const recipients = [];
          if (latestMsg.sender) recipients.push(latestMsg.sender);
          if (latestMsg.recipientEmail) recipients.push(latestMsg.recipientEmail);
          
          setLatestMessageRecipients(recipients);
          setSelectedRecipientEmail(latestMsg.sender);

          // Fetch relevant email accounts for the reply dropdown
          if (latestMsg.organizationId) {
            try {
              const replyAccountsResponse = await fetch(`/api/email-accounts?targetOrganizationId=${latestMsg.organizationId}`);
              if (replyAccountsResponse.ok) {
                const replyAccountsData: EmailAccount[] = await replyAccountsResponse.json();
                setReplyEmailAccounts(replyAccountsData);
              } else {
                console.error(`API Error fetching reply accounts: ${replyAccountsResponse.status}`);
                setReplyEmailAccounts([]);
              }
            } catch (accError) {
              console.error('Error fetching reply email accounts:', accError);
              setReplyEmailAccounts([]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error searching emails:', error);
      toast.error(error instanceof Error ? error.message : 'Error searching emails');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle sending a reply
  const handleReply = async () => {
    if (!searchResults || searchResults.length === 0 || !replyContent.trim() || replyLoading) return;
    
    const latestMessage = searchResults.sort((a, b) => 
      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    )[0];
    
    const isLinkedIn = latestMessage.messageSource === 'LINKEDIN';
    
    // Validation checks
    if ((isLinkedIn && !selectedSocialAccount) || (!isLinkedIn && !selectedFromEmail)) {
      toast.error(`Please select ${isLinkedIn ? 'a LinkedIn' : 'an email'} account to reply from.`);
      return;
    }
    
    if (!isLinkedIn && !selectedRecipientEmail) { 
      toast.error('Please select a recipient to send the reply to.');
      return;
    }
    
    setReplyLoading(true);
    
    try {
      // Use the selected recipient email state for non-LinkedIn messages
      const toAddress = isLinkedIn ? latestMessage.sender : selectedRecipientEmail; 
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
      
      // Reset reply state
      setIsReplying(false);
      setReplyContent('');
      
      // Refresh search results
      handleSearch();
      
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  // Update status of the current thread
  const handleStatusUpdate = async (messageId: string, newStatus: ConversationStatus) => {
    if (!messageId || actionLoading) return;
    
    setActionLoading(true);
    
    try {
      // Update status via API
      const response = await fetch('/api/messages/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: messageId, status: newStatus }),
      });
      
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      toast.success(`Status updated to ${getStatusLabel(newStatus)}`);
      
      // Refresh search results
      handleSearch();
      
      // Reset reply state
      setIsReplying(false);
      setReplyContent('');
      
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle message deletion
  const handleDelete = async (messageId: string) => {
    if (!messageId || actionLoading) return;
    
    setActionLoading(true);
    
    if (!confirm('Are you sure you want to delete this message?')) {
      setActionLoading(false);
      return;
    }
    
    try {
      // Delete the message via API
      const response = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      toast.success('Message deleted');
      
      // Refresh search results
      handleSearch();
      
      // Reset reply state
      setIsReplying(false);
      setReplyContent('');
      
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete message');
    } finally {
      setActionLoading(false);
    }
  };

  // Callback for AISuggestionPanel to update suggestions state
  const handleSuggestionsUpdate = useCallback((newSuggestions: { s1: string | null, s2: string | null, s3: string | null }) => {
    setDisplayedSuggestions(newSuggestions);
    toast.success("AI suggestions updated!");
    console.log('[EmailSearch] Received updated suggestions from panel:', newSuggestions);
  }, []);

  // Loading state
  if (loading && status === 'loading') {
    return (
      <PageContainer>
        <PageHeader
          title="Email Search"
          description="Search for email conversations"
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
          title="Email Search"
          description="Search for email conversations"
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
        title="Email Search"
        description="Search for email conversations by email address"
      />

      {/* Search Box */}
      <ClientCard className="p-6 mb-6 border-slate-200/60 shadow-lg shadow-slate-200/50">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <Input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Enter email address to search"
              className="w-full"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <ClientButton onClick={handleSearch} disabled={isSearching || !searchEmail.trim()}>
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                <span>Search</span>
              </>
            )}
          </ClientButton>
        </div>
      </ClientCard>

      {/* Search Results */}
      {isSearching ? (
        <ClientCard className="p-8 text-center border-slate-200/60 shadow-lg shadow-slate-200/50">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-slate-500 mb-4" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Searching...</h3>
          <p className="text-slate-600">Looking for emails with {searchEmail}</p>
        </ClientCard>
      ) : searchResults.length > 0 ? (
        <ClientCard className="border-slate-200/60 shadow-lg shadow-slate-200/50">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-200/60 p-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Search Results: {searchResults.length} emails found
              </h3>
              <p className="text-sm text-slate-600">
                Showing all emails for <span className="font-medium">{searchEmail}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <ClientButton
                variant="outline"
                size="sm"
                onClick={handleSearch}
                disabled={isSearching}
                className="flex-shrink-0"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                <span>Refresh</span>
              </ClientButton>
              <ClientButton 
                variant="outline" 
                size="sm"
                onClick={() => setIsReplying(prev => !prev)}
                disabled={actionLoading || searchResults.length === 0}
              >
                <Reply className="h-4 w-4 mr-1" />
                <span>{isReplying ? 'Hide Reply' : 'Reply'}</span>
              </ClientButton>
              <div className="flex bg-slate-50 rounded-md p-1 gap-1">
                <ClientButton 
                  variant="ghost" 
                  size="sm"
                  className="text-green-600 hover:text-green-800 hover:bg-green-50"
                  onClick={() => {
                    const latestMessage = searchResults.sort((a, b) => 
                      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
                    )[0];
                    handleStatusUpdate(latestMessage.id, ConversationStatus.MEETING_BOOKED);
                  }}
                  disabled={actionLoading || searchResults.length === 0}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Booked</span>
                </ClientButton>
                <ClientButton 
                  variant="ghost" 
                  size="sm"
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  onClick={() => {
                    const latestMessage = searchResults.sort((a, b) => 
                      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
                    )[0];
                    handleStatusUpdate(latestMessage.id, ConversationStatus.NOT_INTERESTED);
                  }}
                  disabled={actionLoading || searchResults.length === 0}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  <span>Not Interested</span>
                </ClientButton>
                <ClientButton 
                  variant="ghost" 
                  size="sm"
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                  onClick={() => {
                    const latestMessage = searchResults.sort((a, b) => 
                      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
                    )[0];
                    handleStatusUpdate(latestMessage.id, ConversationStatus.NO_ACTION_NEEDED);
                  }}
                  disabled={actionLoading || searchResults.length === 0}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>No Action</span>
                </ClientButton>
              </div>
            </div>
          </div>

          {/* Thread Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {/* Thread View */}
            <ConversationThreadView
              messages={searchResults}
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
                    {searchResults.length > 0 && isLinkedInMessage(searchResults[0]) ? (
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
                          {replyEmailAccounts
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
                  
                  {/* To Select (Recipient Picker) */}
                  <div>
                    <label htmlFor="recipientSelect" className="block text-xs font-medium text-slate-600 mb-1">Send to</label>
                    <Select
                      value={selectedRecipientEmail}
                      onValueChange={setSelectedRecipientEmail}
                      disabled={!latestMessageRecipients || latestMessageRecipients.length === 0 || (searchResults.length > 0 && isLinkedInMessage(searchResults[0]))}
                    >
                      <SelectTrigger id="recipientSelect" className="w-full bg-white">
                        <SelectValue placeholder="Select recipient..." />
                      </SelectTrigger>
                      <SelectContent>
                        {latestMessageRecipients?.map((email) => (
                          <SelectItem key={email} value={email}>
                            {email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {searchResults.length > 0 && isLinkedInMessage(searchResults[0]) && (
                      <div className="mt-1 text-sm text-slate-500 border border-slate-200 rounded-md p-2 bg-slate-100/50 h-[40px] flex items-center">
                        {searchResults.length > 0 
                          ? searchResults.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())[0].sender 
                          : ''
                        } (LinkedIn - cannot change)
                      </div>
                    )}
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
                      disabled={
                        !replyContent.trim() || 
                        replyLoading || 
                        (searchResults.length > 0 && isLinkedInMessage(searchResults[0]) 
                          ? !selectedSocialAccount 
                          : (!selectedFromEmail || !selectedRecipientEmail))
                      }
                      className="flex items-center gap-2"
                    >
                      {replyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {replyLoading ? 'Sending...' : 'Send Reply'}
                    </ClientButton>
                  </div>

                  {/* AI Suggestion Panel Integration */}
                  <AISuggestionPanel
                    latestMessage={
                      searchResults && searchResults.length > 0
                        ? searchResults.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())[0]
                        : null
                    }
                    suggestions={displayedSuggestions}
                    onUseSuggestion={setReplyContent}
                    onSuggestionsUpdated={handleSuggestionsUpdate}
                  />
                </div>
              </div>
            )}
          </div>
        </ClientCard>
      ) : searchEmail && !isSearching ? (
        <ClientCard className="p-8 text-center border-slate-200/60 shadow-lg shadow-slate-200/50">
          <Search className="h-12 w-12 mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">No Results Found</h3>
          <p className="text-slate-600">No emails found for {searchEmail}</p>
        </ClientCard>
      ) : null}
    </PageContainer>
  );
}
