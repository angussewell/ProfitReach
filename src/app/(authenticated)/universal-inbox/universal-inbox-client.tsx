'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { ClientCard, ClientButton, ClientInput } from '@/components/ui/client-components';
import { Inbox, Loader2, MessageSquare, Reply, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideProps } from 'lucide-react';
import { toast } from 'sonner';

type MessageType = 'REAL_REPLY' | 'BOUNCE' | 'AUTO_REPLY' | 'OUT_OF_OFFICE' | 'OTHER';

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
}

const LoaderIcon: React.FC<LucideProps> = Loader2;
const InboxIcon: React.FC<LucideProps> = Inbox;
const MessageIcon: React.FC<LucideProps> = MessageSquare;
const ReplyIcon: React.FC<LucideProps> = Reply;
const SendIcon: React.FC<LucideProps> = Send;
const CloseIcon: React.FC<LucideProps> = X;

export function UniversalInboxClient() {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState<Array<{ id: string; email: string; unipileAccountId: string | null }>>([]);
  const [selectedFromEmail, setSelectedFromEmail] = useState<string>('');

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

  // Reset selected email when opening reply modal
  useEffect(() => {
    if (showReplyModal && selectedThread) {
      const latestMessage = threadGroups[selectedThread]
        .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())[0];
      setSelectedFromEmail(latestMessage.recipientEmail);
    }
  }, [showReplyModal, selectedThread]);

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
      const latestMessage = threadGroups[selectedThread]
        .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())[0];

      // Find the selected email account
      const selectedAccount = emailAccounts.find(account => account.email === selectedFromEmail);
      if (!selectedAccount?.unipileAccountId) {
        throw new Error('Selected email account is not properly configured');
      }

      const response = await fetch('/api/messages/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: latestMessage.messageId,
          content: replyContent,
          action: 'reply',
          fromEmail: selectedFromEmail
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reply');
      }

      toast.success('Reply sent successfully');
      setShowReplyModal(false);
      setReplyContent('');
      
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

        <div className="grid grid-cols-12 gap-6">
          {/* Thread List */}
          <div className="col-span-4">
            <ClientCard className="h-[calc(100vh-14rem)] overflow-hidden flex flex-col border-slate-200/60 shadow-lg shadow-slate-200/50">
              <div className="px-6 py-4 border-b border-slate-200/60 flex items-center bg-white/95">
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
                    
                    return (
                      <button
                        key={threadId}
                        className={cn(
                          "w-full px-6 py-3.5 text-left transition-all",
                          "hover:bg-slate-50/80",
                          selectedThread === threadId ? "bg-slate-100/90" : "",
                          !latestMessage.isRead && "bg-blue-50/70 hover:bg-blue-50/90"
                        )}
                        onClick={() => setSelectedThread(threadId)}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm truncate",
                              !latestMessage.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                            )}>
                              {latestMessage.subject}
                            </p>
                            <p className="text-sm text-slate-600 truncate mt-1">
                              {latestMessage.sender}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(latestMessage.receivedAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {!latestMessage.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="bg-slate-100 rounded-full p-4 mb-4">
                    <MessageIcon className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="font-medium text-slate-900">No replies yet</p>
                  <p className="text-sm mt-2 text-slate-600 max-w-[280px]">
                    When you receive replies to your messages, they'll appear here.
                  </p>
                </div>
              )}
            </ClientCard>
          </div>
          
          {/* Conversation View */}
          <div className="col-span-8">
            <ClientCard className="h-[calc(100vh-14rem)] overflow-hidden flex flex-col border-slate-200/60 shadow-lg shadow-slate-200/50">
              {selectedThread ? (
                <>
                  <div className="px-6 py-4 border-b border-slate-200/60 bg-white/95 flex justify-between items-center sticky top-0">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {threadGroups[selectedThread][0].subject}
                    </h2>
                    <ClientButton
                      onClick={() => setShowReplyModal(true)}
                      className="flex items-center gap-2"
                    >
                      <ReplyIcon className="h-4 w-4" />
                      Reply
                    </ClientButton>
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {threadGroups[selectedThread]
                      ?.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime())
                      .map((message, index, array) => (
                        <div 
                          key={message.id} 
                          className={cn(
                            "bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 transition-all hover:shadow-md",
                            index === array.length - 1 && "bg-blue-50/30"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-slate-900">{message.sender}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                to {message.recipientEmail}
                              </p>
                            </div>
                            <p className="text-xs text-slate-400">
                              {new Date(message.receivedAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="prose prose-slate prose-sm max-w-none mt-4">
                            <p className="text-slate-600 whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
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
          </div>
        </div>
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
                  {emailAccounts.map(account => (
                    <option 
                      key={account.id} 
                      value={account.email}
                      disabled={!account.unipileAccountId}
                    >
                      {account.email} {!account.unipileAccountId && '(Not configured)'}
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
    </PageContainer>
  );
} 