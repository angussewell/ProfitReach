'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ClientButton as Button,
  ClientInput as Input,
  ClientCard as Card,
  ClientSwitch as Switch,
  ClientPencilIcon,
  ClientTrashIcon
} from '@/components/ui/client-components';

interface EmailAccount {
  id: string;
  name: string;
  email: string;
  unipileAccountId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export function EmailAccountsClient() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter accounts based on search query
  const filteredAccounts = accounts.filter(account => 
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchEmailAccounts();
  }, []);

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

  const handleNameInputBlur = async (account: EmailAccount) => {
    if (!account.id || !accountName.trim()) return;

    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/email-accounts/${account.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: accountName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to update account name');
      }

      toast.success('Account name updated successfully');
      setEditingAccountId(null);
      fetchEmailAccounts();
    } catch (error) {
      console.error('Error updating account name:', error);
      toast.error('Failed to update account name');
    }
  };

  const handleNameInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, account: EmailAccount) => {
    if (e.key === 'Enter') {
      handleNameInputBlur(account);
    }
  };

  const handleToggleActive = async (account: EmailAccount) => {
    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/email-accounts/${account.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: account.name, isActive: !account.isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update account status');
      }

      toast.success(`Account ${!account.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchEmailAccounts();
    } catch (error) {
      console.error('Error updating account status:', error);
      toast.error('Failed to update account status');
    }
  };

  const handleDelete = async (account: EmailAccount) => {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }

    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/email-accounts/${account.id}`, {
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

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Email Accounts</h1>
        <Button
          onClick={() => window.open('/api/email-accounts/connect', '_blank')}
        >
          Connect Email Account
        </Button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : accounts.length === 0 ? (
        <Card className="text-center py-12 text-gray-500">
          No email accounts connected yet. Click "Connect Email Account" to get started.
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="grid gap-4">
            {filteredAccounts.map((account) => (
              <Card key={account.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {editingAccountId === account.id ? (
                      <Input
                        value={accountName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccountName(e.target.value)}
                        onBlur={() => handleNameInputBlur(account)}
                        onKeyDown={(e) => handleNameInputKeyPress(e, account)}
                        className="max-w-[300px]"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingAccountId(account.id);
                            setAccountName(account.name);
                          }}
                        >
                          <ClientPencilIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <div className="text-sm text-gray-500 mt-1">{account.email}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {account.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <Switch
                        checked={account.isActive}
                        onCheckedChange={() => handleToggleActive(account)}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(account)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <ClientTrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 