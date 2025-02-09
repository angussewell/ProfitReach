'use client';

import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import {
  ClientButton,
  ClientInput,
  ClientCard,
  ClientSelect,
  ClientSelectContent,
  ClientSelectItem,
  ClientSelectTrigger,
  ClientSelectValue,
} from '@/components/ui/client-components';

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

interface EmailAccount {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

interface Organization {
  id: string;
  name: string;
  emailAccounts: EmailAccount[];
}

export function UniversalInboxClient() {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageFilter, setMessageFilter] = useState<MessageType | 'ALL'>('ALL');

  // Fetch organizations and their email accounts
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('/api/organizations?include=emailAccounts');
        if (!response.ok) throw new Error('Failed to fetch organizations');
        const data = await response.json();
        setOrganizations(data);
        if (data.length > 0) setSelectedOrg(data[0].id);
      } catch (error) {
        console.error('Error fetching organizations:', error);
      }
    };
    
    fetchOrganizations();
  }, []);

  // Fetch messages when organization or account selection changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedOrg) return;
      
      setLoading(true);
      try {
        const url = new URL('/api/messages', window.location.origin);
        url.searchParams.set('organizationId', selectedOrg);
        if (selectedAccount && selectedAccount !== 'all') {
          url.searchParams.set('accountId', selectedAccount);
        }
        if (messageFilter !== 'ALL') url.searchParams.set('messageType', messageFilter);
        
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
  }, [selectedOrg, selectedAccount, messageFilter]);

  // Group messages by thread
  const threadGroups = messages.reduce((groups, message) => {
    if (!groups[message.threadId]) {
      groups[message.threadId] = [];
    }
    groups[message.threadId].push(message);
    return groups;
  }, {} as Record<string, EmailMessage[]>);

  return (
    <PageContainer>
      <PageHeader
        title="Universal Inbox"
        description="View and manage all your email communications in one place."
      />
      
      <div className="grid grid-cols-12 gap-4 mt-4">
        {/* Left Panel - Organization & Account Selection */}
        <div className="col-span-3 space-y-4">
          <ClientCard className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Organization</label>
              <ClientSelect
                value={selectedOrg || ""}
                onValueChange={setSelectedOrg}
              >
                <ClientSelectTrigger>
                  <ClientSelectValue placeholder="Select organization" />
                </ClientSelectTrigger>
                <ClientSelectContent>
                  {organizations.map(org => (
                    <ClientSelectItem key={org.id} value={org.id}>
                      {org.name}
                    </ClientSelectItem>
                  ))}
                </ClientSelectContent>
              </ClientSelect>
            </div>
            
            <div>
              <label className="text-sm font-medium">Email Account</label>
              <ClientSelect
                value={selectedAccount}
                onValueChange={setSelectedAccount}
              >
                <ClientSelectTrigger>
                  <ClientSelectValue placeholder="All accounts" />
                </ClientSelectTrigger>
                <ClientSelectContent>
                  <ClientSelectItem value="all">All accounts</ClientSelectItem>
                  {selectedOrg && organizations
                    .find(org => org.id === selectedOrg)
                    ?.emailAccounts
                    .filter(account => account.isActive)
                    .map(account => (
                      <ClientSelectItem key={account.id} value={account.id}>
                        {account.name} ({account.email})
                      </ClientSelectItem>
                    ))}
                </ClientSelectContent>
              </ClientSelect>
            </div>
            
            <div>
              <label className="text-sm font-medium">Message Type</label>
              <ClientSelect
                value={messageFilter}
                onValueChange={(value: string) => setMessageFilter(value as MessageType | 'ALL')}
              >
                <ClientSelectTrigger>
                  <ClientSelectValue placeholder="Filter by type" />
                </ClientSelectTrigger>
                <ClientSelectContent>
                  <ClientSelectItem value="ALL">All Messages</ClientSelectItem>
                  <ClientSelectItem value="REAL_REPLY">Real Replies</ClientSelectItem>
                  <ClientSelectItem value="BOUNCE">Bounces</ClientSelectItem>
                  <ClientSelectItem value="AUTO_REPLY">Auto Replies</ClientSelectItem>
                  <ClientSelectItem value="OUT_OF_OFFICE">Out of Office</ClientSelectItem>
                </ClientSelectContent>
              </ClientSelect>
            </div>
          </ClientCard>
        </div>
        
        {/* Middle Panel - Thread List */}
        <div className="col-span-4">
          <ClientCard className="h-[calc(100vh-12rem)] overflow-y-auto">
            <div className="divide-y">
              {Object.entries(threadGroups).map(([threadId, messages]) => {
                const latestMessage = messages.sort((a, b) => 
                  new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
                )[0];
                
                return (
                  <button
                    key={threadId}
                    className={`w-full p-4 text-left hover:bg-gray-50 ${
                      selectedThread === threadId ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => setSelectedThread(threadId)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {latestMessage.subject}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {latestMessage.sender}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(latestMessage.receivedAt).toLocaleString()}
                        </p>
                      </div>
                      {!latestMessage.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ClientCard>
        </div>
        
        {/* Right Panel - Conversation View */}
        <div className="col-span-5">
          <ClientCard className="h-[calc(100vh-12rem)] overflow-y-auto">
            {selectedThread ? (
              <div className="p-4 space-y-6">
                {threadGroups[selectedThread]
                  ?.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime())
                  .map(message => (
                    <div key={message.id} className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{message.sender}</p>
                          <p className="text-sm text-gray-500">
                            To: {message.recipientEmail}
                          </p>
                        </div>
                        <p className="text-sm text-gray-400">
                          {new Date(message.receivedAt).toLocaleString()}
                        </p>
                      </div>
                      <h3 className="text-lg font-medium">{message.subject}</h3>
                      <div className="prose max-w-none">
                        <p>{message.content}</p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Select a conversation to view messages
              </div>
            )}
          </ClientCard>
        </div>
      </div>
    </PageContainer>
  );
} 