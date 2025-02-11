'use client';

import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { FC, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

interface EmailAccount {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
  unipileAccountId?: string;
}

// Create wrapper components for Lucide icons
const SearchIcon = Search;
const PlusIcon = Plus;
const XIcon = X;

export function EmailAccountsClient() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [pollingForAccount, setPollingForAccount] = useState(false);
  const [initialAccountCount, setInitialAccountCount] = useState<number | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newAccountId, setNewAccountId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

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

            // Find the new account (it will be the one with email as name)
            const newAccount = newAccounts.find(acc => acc.email === acc.name);
            if (newAccount) {
              setNewAccountId(newAccount.id);
              setNewName(newAccount.name);
              setShowNameModal(true);
            }

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

  const handleUpdateName = async () => {
    if (!newAccountId || !newName.trim()) return;

    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/email-accounts/${newAccountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to update account name');
      }

      toast.success('Account name updated successfully');
      setShowNameModal(false);
      fetchEmailAccounts();
    } catch (error) {
      console.error('Error updating account name:', error);
      toast.error('Failed to update account name');
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

      {showNameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-medium mb-4">Enter Account Name</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter account name"
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowNameModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateName}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleConnect}
            disabled={connecting || pollingForAccount}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>
              {connecting ? 'Connecting...' : 
               pollingForAccount ? 'Waiting for account...' : 
               'Connect Email Account'}
            </span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          {searchQuery ? 'No accounts match your search' : 'No email accounts connected yet. Click "Connect Email Account" to get started.'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAccounts.map((account) => (
            <Card key={account.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{account.name}</h3>
                  <p className="text-sm text-slate-500">{account.email}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={account.isActive}
                    onCheckedChange={async (checked) => {
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(account.id)}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
} 