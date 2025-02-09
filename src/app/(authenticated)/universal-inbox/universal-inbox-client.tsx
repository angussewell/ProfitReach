'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { ClientCard, ClientButton } from '@/components/ui/client-components';
import { Inbox, Loader2, MessageSquare, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideProps } from 'lucide-react';

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
const FilterIcon: React.FC<LucideProps> = Filter;
const CloseIcon: React.FC<LucideProps> = X;

export function UniversalInboxClient() {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilteredMessages, setShowFilteredMessages] = useState(false);

  // Fetch messages for current organization
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        // Fetch both real replies and filtered messages
        const [repliesResponse, filteredResponse] = await Promise.all([
          fetch('/api/messages'),
          fetch('/api/messages?includeFiltered=true')
        ]);
        
        if (!repliesResponse.ok || !filteredResponse.ok) 
          throw new Error('Failed to fetch messages');
        
        const [replies, filtered] = await Promise.all([
          repliesResponse.json(),
          filteredResponse.json()
        ]);
        
        setMessages(replies);
        setFilteredMessages(filtered);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
  }, []);

  // Group messages by thread
  const threadGroups = messages.reduce((groups, message) => {
    if (!groups[message.threadId]) {
      groups[message.threadId] = [];
    }
    groups[message.threadId].push(message);
    return groups;
  }, {} as Record<string, EmailMessage[]>);

  const hasMessages = Object.keys(threadGroups).length > 0;
  const hasFilteredMessages = filteredMessages.length > 0;

  // Group filtered messages by type
  const filteredMessagesByType = filteredMessages.reduce((acc, message) => {
    if (!acc[message.messageType]) {
      acc[message.messageType] = [];
    }
    acc[message.messageType].push(message);
    return acc;
  }, {} as Record<MessageType, EmailMessage[]>);

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
          <div className="col-span-5">
            <ClientCard className="h-[calc(100vh-14rem)] overflow-hidden flex flex-col border-slate-200/60 shadow-lg shadow-slate-200/50">
              <div className="px-6 py-4 border-b border-slate-200/60 flex justify-between items-center bg-white/95">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                  <InboxIcon className="h-5 w-5 text-slate-500" />
                  <span>Conversations</span>
                </h2>
                <ClientButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilteredMessages(true)}
                  className={cn(
                    "flex items-center gap-2 text-slate-600 hover:text-amber-700",
                    filteredMessages.length > 0 && "text-amber-700"
                  )}
                >
                  <FilterIcon className="h-4 w-4" />
                  {filteredMessages.length > 0 && (
                    <span className="text-xs font-medium bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full">
                      {filteredMessages.length}
                    </span>
                  )}
                </ClientButton>
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
                          "w-full px-6 py-4 text-left transition-all",
                          "hover:bg-slate-50",
                          selectedThread === threadId ? "bg-slate-100" : "",
                          !latestMessage.isRead && "bg-blue-50/80 hover:bg-blue-50"
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
                            <p className="text-xs text-slate-400 mt-1.5">
                              {new Date(latestMessage.receivedAt).toLocaleString()}
                            </p>
                          </div>
                          {!latestMessage.isRead && (
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
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
          <div className="col-span-7">
            <ClientCard className="h-[calc(100vh-14rem)] overflow-hidden flex flex-col border-slate-200/60 shadow-lg shadow-slate-200/50">
              {selectedThread ? (
                <>
                  <div className="px-6 py-4 border-b border-slate-200/60 bg-white/95">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {threadGroups[selectedThread][0].subject}
                    </h2>
                  </div>
                  <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {threadGroups[selectedThread]
                      ?.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime())
                      .map(message => (
                        <div 
                          key={message.id} 
                          className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 transition-all hover:shadow-md"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-slate-900">{message.sender}</p>
                              <p className="text-sm text-slate-500 mt-0.5">
                                To: {message.recipientEmail}
                              </p>
                            </div>
                            <p className="text-sm text-slate-400">
                              {new Date(message.receivedAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="prose prose-slate prose-sm max-w-none mt-4">
                            <p className="text-slate-600">{message.content}</p>
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

      {/* Filtered Messages Modal */}
      {showFilteredMessages && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[800px] max-h-[80vh] flex flex-col shadow-xl border border-slate-200/60">
            <div className="px-6 py-4 border-b border-slate-200/60 flex justify-between items-center bg-white/95">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                <FilterIcon className="h-5 w-5 text-slate-500" />
                <span>Filtered Messages</span>
              </h2>
              <button
                onClick={() => setShowFilteredMessages(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {Object.entries(filteredMessagesByType).map(([type, messages]) => (
                <div key={type} className="mb-8 last:mb-0">
                  <h3 className="text-sm font-medium text-slate-900 mb-4 flex items-center gap-2">
                    {type.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                      {messages.length}
                    </span>
                  </h3>
                  <div className="space-y-4">
                    {messages.map(message => (
                      <div 
                        key={message.id} 
                        className="bg-slate-50 rounded-lg p-4 hover:bg-slate-100/80 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{message.subject}</p>
                            <p className="text-sm text-slate-600 mt-0.5">{message.sender}</p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {new Date(message.receivedAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-slate-600">{message.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
} 