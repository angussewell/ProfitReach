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
  ClientTrashIcon,
  ClientTabsRoot as Tabs,
  ClientTabsList as TabsList,
  ClientTabsTrigger as TabsTrigger,
  ClientTabsContent as TabsContent,
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

interface SocialAccount {
  id: string;
  name: string;
  username: string;
  provider: string;
  unipileAccountId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export function AccountsClient() {
  const router = useRouter();
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('email');

  // Filter accounts based on search query
  const filteredEmailAccounts = emailAccounts.filter(account => 
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSocialAccounts = socialAccounts.filter(account => 
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const baseUrl = window.location.origin;
      const [emailResponse, socialResponse] = await Promise.all([
        fetch(`${baseUrl}/api/email-accounts`, { credentials: 'include' }),
        fetch(`${baseUrl}/api/social-accounts`, { credentials: 'include' })
      ]);
      
      if (!emailResponse.ok || !socialResponse.ok) {
        throw new Error('Failed to fetch accounts');
      }
      
      const [emailData, socialData] = await Promise.all([
        emailResponse.json(),
        socialResponse.json()
      ]);

      setEmailAccounts(Array.isArray(emailData) ? emailData : []);
      setSocialAccounts(Array.isArray(socialData) ? socialData : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
      setEmailAccounts([]);
      setSocialAccounts([]);
      setLoading(false);
    }
  };

  const handleNameInputBlur = async (account: EmailAccount | SocialAccount, type: 'email' | 'social') => {
    if (!account.id || !accountName.trim()) return;

    try {
      const baseUrl = window.location.origin;
      const endpoint = type === 'email' ? 'email-accounts' : 'social-accounts';
      const response = await fetch(`${baseUrl}/api/${endpoint}/${account.id}`, {
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
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account name:', error);
      toast.error('Failed to update account name');
    }
  };

  const handleNameInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, account: EmailAccount | SocialAccount, type: 'email' | 'social') => {
    if (e.key === 'Enter') {
      handleNameInputBlur(account, type);
    }
  };

  const handleToggleActive = async (account: EmailAccount | SocialAccount, type: 'email' | 'social') => {
    try {
      const baseUrl = window.location.origin;
      const endpoint = type === 'email' ? 'email-accounts' : 'social-accounts';
      const response = await fetch(`${baseUrl}/api/${endpoint}/${account.id}`, {
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
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account status:', error);
      toast.error('Failed to update account status');
    }
  };

  const handleDelete = async (account: EmailAccount | SocialAccount, type: 'email' | 'social') => {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }

    try {
      const baseUrl = window.location.origin;
      const endpoint = type === 'email' ? 'email-accounts' : 'social-accounts';
      const response = await fetch(`${baseUrl}/api/${endpoint}/${account.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      toast.success('Account deleted successfully');
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  const handleConnect = async () => {
    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/accounts/connect`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate connection link');
      }
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error connecting account:', error);
      toast.error('Failed to start account connection');
    }
  };

  const renderAccount = (account: EmailAccount | SocialAccount, type: 'email' | 'social') => (
    <Card key={account.id} className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {editingAccountId === account.id ? (
            <Input
              value={accountName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccountName(e.target.value)}
              onBlur={() => handleNameInputBlur(account, type)}
              onKeyDown={(e) => handleNameInputKeyPress(e, account, type)}
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
          <div className="text-sm text-gray-500 mt-1">
            {type === 'email' 
              ? (account as EmailAccount).email
              : `${(account as SocialAccount).provider} - ${(account as SocialAccount).username}`
            }
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {account.isActive ? 'Active' : 'Inactive'}
            </span>
            <Switch
              checked={account.isActive}
              onCheckedChange={() => handleToggleActive(account, type)}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(account, type)}
            className="text-gray-400 hover:text-red-500"
          >
            <ClientTrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Connected Accounts</h1>
        <Button
          onClick={handleConnect}
        >
          Connect Account
        </Button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : emailAccounts.length === 0 && socialAccounts.length === 0 ? (
        <Card className="text-center py-12 text-gray-500">
          No accounts connected yet. Click "Connect Account" to get started.
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

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="email">Email Accounts</TabsTrigger>
              <TabsTrigger value="social">Social Accounts</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <div className="grid gap-4">
                {filteredEmailAccounts.map((account) => renderAccount(account, 'email'))}
              </div>
              {filteredEmailAccounts.length === 0 && (
                <Card className="text-center py-12 text-gray-500">
                  No email accounts found.
                </Card>
              )}
            </TabsContent>

            <TabsContent value="social">
              <div className="grid gap-4">
                {filteredSocialAccounts.map((account) => renderAccount(account, 'social'))}
              </div>
              {filteredSocialAccounts.length === 0 && (
                <Card className="text-center py-12 text-gray-500">
                  No social accounts found.
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
} 