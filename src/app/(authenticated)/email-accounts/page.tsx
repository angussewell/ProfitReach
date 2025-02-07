'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { ButtonProps } from '@/components/ui/button';
import type { InputProps } from '@/components/ui/input';
import type { HTMLAttributes } from 'react';
import { Switch } from '@/components/ui/switch';

interface EmailAccount {
  id: string;
  email: string;
  name: string;
  password: string;
  host: string;
  port: number;
  isActive: boolean;
}

// Create client-side components
const ClientButton = Button as React.ComponentType<ButtonProps>;
const ClientInput = Input as React.ComponentType<InputProps>;
const ClientCard = Card as React.ComponentType<HTMLAttributes<HTMLDivElement>>;
const ClientCardHeader = CardHeader as React.ComponentType<HTMLAttributes<HTMLDivElement>>;
const ClientCardTitle = CardTitle as React.ComponentType<HTMLAttributes<HTMLHeadingElement>>;

// Create client-side icons
const ClientPlus = Plus as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>;
const ClientSearch = Search as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>;
const ClientX = X as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>;

export default function EmailAccountsPage() {
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch email accounts
  useEffect(() => {
    fetchEmailAccounts();
  }, []);

  const fetchEmailAccounts = async () => {
    try {
      const response = await fetch('/api/email-accounts');
      if (response.status === 401 && retryCount < 3) {
        // If unauthorized and haven't retried too many times, wait and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRetryCount(prev => prev + 1);
        fetchEmailAccounts();
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch email accounts');
      }
      
      const data = await response.json();
      setEmailAccounts(data);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      toast.error('Failed to load email accounts');
      console.error('Error fetching email accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    try {
      const response = await fetch('/api/email-accounts' + (editingAccount.id ? `/${editingAccount.id}` : ''), {
        method: editingAccount.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAccount),
      });

      if (!response.ok) throw new Error('Failed to save email account');
      
      toast.success('Email account saved successfully');
      setEditingAccount(null);
      fetchEmailAccounts();
    } catch (error) {
      toast.error('Failed to save email account');
      console.error('Error saving email account:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this email account?')) return;

    try {
      const response = await fetch(`/api/email-accounts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete email account');
      
      toast.success('Email account deleted successfully');
      fetchEmailAccounts();
    } catch (error) {
      toast.error('Failed to delete email account');
      console.error('Error deleting email account:', error);
    }
  };

  const filteredAccounts = emailAccounts.filter(account => 
    account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <PageHeader 
            title="Email Accounts"
            description="Manage your email sender accounts">
            <ClientButton disabled>
              <ClientPlus className="w-4 h-4 mr-2" />
              New Email Account
            </ClientButton>
          </PageHeader>

          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <ClientCard key={i} className="p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-100 rounded w-48"></div>
                    <div className="h-3 bg-gray-100 rounded w-40"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-gray-100 rounded w-16"></div>
                    <div className="h-8 bg-gray-100 rounded w-16"></div>
                  </div>
                </div>
              </ClientCard>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader 
          title="Email Accounts"
          description="Manage your email sender accounts">
          <ClientButton 
            onClick={() => setEditingAccount({ id: '', email: '', name: '', password: '', host: '', port: 587, isActive: true })}
            className="technical-button"
          >
            <ClientPlus className="w-4 h-4 mr-2" />
            New Email Account
          </ClientButton>
        </PageHeader>

        <div className="relative max-w-2xl">
          <ClientSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <ClientInput
            className="technical-input pl-10"
            placeholder="Search email accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {editingAccount && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <ClientCard className="technical-card w-full max-w-lg">
              <ClientCardHeader className="pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <ClientCardTitle className="technical-header">
                    {editingAccount.id ? 'Edit Email Account' : 'New Email Account'}
                  </ClientCardTitle>
                  <ClientButton 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingAccount(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ClientX className="w-5 h-5" />
                  </ClientButton>
                </div>
              </ClientCardHeader>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <ClientInput
                    required
                    type="email"
                    value={editingAccount.email}
                    onChange={e => setEditingAccount({...editingAccount, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <ClientInput
                    required
                    value={editingAccount.name}
                    onChange={e => setEditingAccount({...editingAccount, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password (SMTP)</label>
                  <ClientInput
                    required
                    type="password"
                    value={editingAccount.password}
                    onChange={e => setEditingAccount({...editingAccount, password: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SMTP Host</label>
                  <ClientInput
                    required
                    value={editingAccount.host}
                    onChange={e => setEditingAccount({...editingAccount, host: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SMTP Port</label>
                  <ClientInput
                    required
                    type="number"
                    value={editingAccount.port}
                    onChange={e => setEditingAccount({...editingAccount, port: parseInt(e.target.value)})}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <ClientButton type="button" variant="outline" onClick={() => setEditingAccount(null)}>
                    Cancel
                  </ClientButton>
                  <ClientButton type="submit">
                    Save
                  </ClientButton>
                </div>
              </form>
            </ClientCard>
          </div>
        )}

        <div className="grid gap-4 mt-6">
          {filteredAccounts.length === 0 ? (
            <p className="text-muted-foreground">No email accounts found.</p>
          ) : (
            filteredAccounts.map(account => (
              <ClientCard key={account.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{account.name}</h3>
                    <p className="text-sm text-muted-foreground">{account.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      SMTP: {account.host}:{account.port}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">Active</label>
                      <Switch
                        checked={account.isActive}
                        onCheckedChange={async (checked) => {
                          try {
                            const response = await fetch(`/api/email-accounts/${account.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ...account, isActive: checked }),
                            });

                            if (!response.ok) throw new Error('Failed to update account');
                            
                            toast.success('Email account updated successfully');
                            fetchEmailAccounts();
                          } catch (error) {
                            toast.error('Failed to update email account');
                            console.error('Error updating email account:', error);
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <ClientButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingAccount(account)}
                      >
                        Edit
                      </ClientButton>
                      <ClientButton
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(account.id)}
                      >
                        Delete
                      </ClientButton>
                    </div>
                  </div>
                </div>
              </ClientCard>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
} 