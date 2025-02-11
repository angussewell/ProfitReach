'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import {
  ClientButton,
  ClientInput,
  ClientCard,
  ClientSwitch,
  ClientSearchIcon,
  ClientPlusIcon,
  ClientXIcon,
} from '@/components/ui/client-components';
import { toast } from 'sonner';

interface EmailAccount {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
  unipileAccountId?: string;
}

export function EmailAccountsClient() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [pollingForAccount, setPollingForAccount] = useState(false);
  const [initialAccountCount, setInitialAccountCount] = useState<number | null>(null);

  useEffect(() => {
    fetchEmailAccounts();
  }, []);

  // Add polling when redirected with success=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    
    if (success === 'true') {
      setPollingForAccount(true);
      let attempts = 0;
      const maxAttempts = 10; // 30 seconds total (10 attempts * 3 second interval)
      
      // Store initial account count
      setInitialAccountCount(accounts.length);
      
      const pollInterval = setInterval(async () => {
        attempts++;
        console.log(`Polling for new account (attempt ${attempts}/${maxAttempts})...`);
        
        try {
          const baseUrl = window.location.origin;
          const response = await fetch(`${baseUrl}/api/email-accounts`, {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch accounts while polling');
          }
          
          const data = await response.json();
          const newAccounts = Array.isArray(data) ? data : [];
          setAccounts(newAccounts);
          
          // Check if we have more accounts than when we started
          if (initialAccountCount !== null && newAccounts.length > initialAccountCount) {
            console.log('Found new account while polling:', {
              initialCount: initialAccountCount,
              newCount: newAccounts.length,
              accounts: newAccounts
            });
            clearInterval(pollInterval);
            setPollingForAccount(false);
            toast.success('Email account connected successfully!');
            // Clear the success parameter from URL
            window.history.replaceState({}, '', window.location.pathname);
          }
        } catch (error) {
          console.error('Error while polling:', error);
        }
        
        if (attempts >= maxAttempts) {
          console.log('Polling timeout reached');
          clearInterval(pollInterval);
          setPollingForAccount(false);
          toast.error('Account connection is taking longer than expected. Please refresh the page in a few moments.');
          // Clear the success parameter from URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      }, 3000); // Poll every 3 seconds
      
      return () => clearInterval(pollInterval);
    }
  }, [accounts.length, initialAccountCount]);

  const fetchEmailAccounts = async () => {
    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/email-accounts`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch email accounts');
      }
      
      const data = await response.json();
      setAccounts(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load email accounts');
      setAccounts([]);
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/email-accounts/connect`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to generate connection link');
      }

      const { url } = await response.json();
      if (!url) {
        throw new Error('No URL returned from server');
      }
      
      window.location.href = url;
    } catch (error) {
      console.error('Error connecting account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start account connection');
      setConnecting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/email-accounts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      toast.success('Account deleted successfully');
      fetchEmailAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  const filteredAccounts = accounts.filter(account =>
    account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContainer>
      <PageHeader
        title="Email Accounts"
        description="Connect and manage your email accounts (Gmail, Outlook, or IMAP)"
      />

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <ClientSearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <ClientInput
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <ClientButton
            onClick={handleConnect}
            disabled={connecting || pollingForAccount}
            className="flex items-center space-x-2"
          >
            <ClientPlusIcon className="h-4 w-4" />
            <span>
              {connecting ? 'Connecting...' : 
               pollingForAccount ? 'Waiting for account...' : 
               'Connect Email Account'}
            </span>
          </ClientButton>
        </div>
      </div>

      {loading || pollingForAccount ? (
        <div className="text-center py-12">
          {pollingForAccount ? 'Waiting for account connection...' : 'Loading...'}
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          {searchQuery ? 'No accounts match your search' : 'No email accounts connected yet. Click "Connect Email Account" to get started.'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAccounts.map((account) => (
            <ClientCard key={account.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{account.name}</h3>
                  <p className="text-sm text-slate-500">{account.email}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <ClientSwitch
                    checked={account.isActive}
                    onCheckedChange={async (checked: boolean) => {
                      try {
                        const baseUrl = window.location.origin;
                        const response = await fetch(`${baseUrl}/api/email-accounts/${account.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          credentials: 'include',
                          body: JSON.stringify({ isActive: checked }),
                        });

                        if (!response.ok) {
                          throw new Error('Failed to update account');
                        }

                        toast.success('Account updated successfully');
                        fetchEmailAccounts();
                      } catch (error) {
                        console.error('Error updating account:', error);
                        toast.error('Failed to update account');
                      }
                    }}
                  />
                  <ClientButton
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(account.id)}
                  >
                    <ClientXIcon className="h-4 w-4" />
                  </ClientButton>
                </div>
              </div>
            </ClientCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
} 