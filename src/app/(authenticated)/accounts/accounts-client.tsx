'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  ClientButton,
  ClientInput,
  ClientCard,
  ClientSwitch,
  ClientTabsRoot,
  ClientTabsList,
  ClientTabsTrigger,
  ClientTabsContent,
  ClientPencilIcon,
  ClientTrashIcon,
  ClientSelect,
  ClientSelectTrigger,
  ClientSelectValue,
  ClientSelectContent,
  ClientSelectItem
} from '@/components/ui/client-components';

interface EmailAccount {
  id: string;
  name: string;
  email: string;
  unipileAccountId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isHidden?: boolean;
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
  emailAccountId: string | null;
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
  const [updatingAssociation, setUpdatingAssociation] = useState(false);

  // Filter accounts based on search query and visibility
  const filteredEmailAccounts = emailAccounts.filter(account => 
    !account.isHidden && // Filter out hidden accounts
    (account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSocialAccounts = socialAccounts.filter(account => 
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get available email accounts for a social account
  const getAvailableEmailAccounts = (socialAccountId: string) => {
    // Find which email accounts are already associated with other social accounts
    const associatedEmailIds = socialAccounts
      .filter(account => account.id !== socialAccountId && account.emailAccountId)
      .map(account => account.emailAccountId);
    
    // Return only visible email accounts that are not associated with any other social account
    return emailAccounts.filter(email => 
      !email.isHidden && // Filter out hidden accounts
      !associatedEmailIds.includes(email.id)
    );
  };
  
  // Handle associating/dissociating an email account with a social account
  const handleAssociateEmail = async (socialAccountId: string, emailAccountId: string | null) => {
    try {
      setUpdatingAssociation(true);
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/social-accounts/${socialAccountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          emailAccountId: emailAccountId,
          // We need to include the name field as it's required by the validation schema
          name: socialAccounts.find(account => account.id === socialAccountId)?.name || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update email association');
      }

      toast.success(emailAccountId ? 'Email account associated successfully' : 'Email account association removed');
      fetchAccounts();
    } catch (error) {
      console.error('Error updating email association:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update email association');
    } finally {
      setUpdatingAssociation(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const baseUrl = window.location.origin;
      
      // Fetch email accounts
      try {
        const emailResponse = await fetch(`${baseUrl}/api/email-accounts`, { credentials: 'include' });
        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          setEmailAccounts(Array.isArray(emailData) ? emailData : []);
        } else {
          console.error('Failed to fetch email accounts');
          setEmailAccounts([]);
        }
      } catch (emailError) {
        console.error('Error fetching email accounts:', emailError);
        setEmailAccounts([]);
      }
      
      // Fetch social accounts
      try {
        const socialResponse = await fetch(`${baseUrl}/api/social-accounts`, { credentials: 'include' });
        if (socialResponse.ok) {
          const socialData = await socialResponse.json();
          setSocialAccounts(Array.isArray(socialData) ? socialData : []);
        } else {
          console.error('Failed to fetch social accounts');
          setSocialAccounts([]);
        }
      } catch (socialError) {
        console.error('Error fetching social accounts:', socialError);
        setSocialAccounts([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchAccounts:', error);
      toast.error('Some accounts failed to load');
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
        body: JSON.stringify({ 
          name: accountName.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update account name');
      }

      toast.success('Account name updated successfully');
      setEditingAccountId(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account name:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update account name');
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
        body: JSON.stringify({ isActive: !account.isActive }),
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
      
      // First verify the session
      console.log('Verifying session...');
      const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!sessionResponse.ok) {
        console.error('Session verification failed:', {
          status: sessionResponse.status,
          statusText: sessionResponse.statusText
        });
        throw new Error('Authentication failed. Please try logging in again.');
      }
      
      const session = await sessionResponse.json();
      console.log('Session verified:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        organizationId: session?.user?.organizationId
      });

      if (!session?.user?.organizationId) {
        throw new Error('No organization found. Please contact support.');
      }
      
      // Determine account type based on active tab
      const accountType = activeTab === 'social' ? 'LINKEDIN' : 'EMAIL';
      
      // Now try to get the connection link
      console.log('Requesting connection link...', {
        accountType,
        activeTab
      });

      const response = await fetch(`${baseUrl}/api/accounts/connect`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ accountType })
      });
      
      // Get response text first
      const responseText = await response.text();
      
      // Try to parse as JSON
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse error response:', {
          status: response.status,
          text: responseText,
          error: parseError
        });
        throw new Error('Unexpected response from server. Please try again.');
      }
      
      if (!response.ok) {
        console.error('Failed to get connection link:', {
          status: response.status,
          error: errorData
        });
        
        // Extract error message from response
        let errorMessage = 'Failed to generate connection link';
        if (errorData.details) {
          errorMessage = errorData.details;
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'object' 
            ? JSON.stringify(errorData.error) 
            : errorData.error;
        }
        
        throw new Error(errorMessage);
      }
      
      if (!errorData.url) {
        console.error('No connection URL in response:', errorData);
        throw new Error('Invalid response from server. Please try again.');
      }

      // Redirect to the connection URL
      window.location.href = errorData.url;
    } catch (error) {
      console.error('Error connecting account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect account');
    }
  };

  const renderAccount = (account: EmailAccount | SocialAccount, type: 'email' | 'social') => (
    <ClientCard key={account.id} className="p-4">
      <div className="flex flex-col space-y-3">
        {/* Header with name and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {editingAccountId === account.id ? (
              <ClientInput
                value={accountName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccountName(e.target.value)}
                onBlur={() => handleNameInputBlur(account, type)}
                onKeyDown={(e) => handleNameInputKeyPress(e, account, type)}
                className="max-w-[300px]"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium text-lg">{account.name}</span>
                <ClientButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingAccountId(account.id);
                    setAccountName(account.name);
                  }}
                >
                  <ClientPencilIcon className="h-3.5 w-3.5" />
                </ClientButton>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {account.isActive ? 'Active' : 'Inactive'}
              </span>
              <ClientSwitch
                checked={account.isActive}
                onCheckedChange={() => handleToggleActive(account, type)}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
            <ClientButton
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(account, type)}
              className="text-gray-400 hover:text-red-500"
            >
              <ClientTrashIcon className="h-4 w-4" />
            </ClientButton>
          </div>
        </div>

        {/* Account details */}
        <div className="text-sm text-gray-500">
          {type === 'email' 
            ? (account as EmailAccount).email
            : <div className="flex flex-col space-y-1">
              </div>
          }
        </div>
          
        {/* Email account association dropdown for social accounts */}
        {type === 'social' && (
          <div className="mt-1">
            <ClientSelect
              value={(account as SocialAccount).emailAccountId || "none"}
              onValueChange={(value) => handleAssociateEmail(account.id, value === "none" ? null : value)}
              disabled={updatingAssociation}
            >
              <ClientSelectTrigger className="w-full h-9 text-sm">
                <ClientSelectValue placeholder="Select an email account" />
              </ClientSelectTrigger>
              <ClientSelectContent>
                <ClientSelectItem value="none">
                  No association
                </ClientSelectItem>
                {getAvailableEmailAccounts(account.id).map((email) => (
                  <ClientSelectItem key={email.id} value={email.id}>
                    {email.name} ({email.email})
                  </ClientSelectItem>
                ))}
                {/* If this social account already has an associated email that wouldn't be in the available list */}
                {(account as SocialAccount).emailAccountId && 
                  !getAvailableEmailAccounts(account.id).some(email => email.id === (account as SocialAccount).emailAccountId) && 
                  emailAccounts.find(email => email.id === (account as SocialAccount).emailAccountId) && (
                    <ClientSelectItem key={(account as SocialAccount).emailAccountId} value={(account as SocialAccount).emailAccountId}>
                      {emailAccounts.find(email => email.id === (account as SocialAccount).emailAccountId)?.name} 
                      ({emailAccounts.find(email => email.id === (account as SocialAccount).emailAccountId)?.email})
                    </ClientSelectItem>
                  )
                }
              </ClientSelectContent>
            </ClientSelect>
          </div>
        )}
      </div>
    </ClientCard>
  );

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Connected Accounts</h2>
            <p className="text-sm text-muted-foreground">
              Manage your connected email and LinkedIn accounts
            </p>
          </div>
          <ClientButton onClick={handleConnect}>Connect Account</ClientButton>
        </div>

        <div className="space-y-4">
          <ClientInput
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />

          <ClientTabsRoot value={activeTab} onValueChange={setActiveTab}>
            <ClientTabsList>
              <ClientTabsTrigger value="email">Email Accounts</ClientTabsTrigger>
              <ClientTabsTrigger value="social">LinkedIn Accounts</ClientTabsTrigger>
            </ClientTabsList>

            <ClientTabsContent value="email" className="space-y-4">
              {loading ? (
                <div>Loading...</div>
              ) : filteredEmailAccounts.length > 0 ? (
                filteredEmailAccounts.map((account) => renderAccount(account, 'email'))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No email accounts found
                </div>
              )}
            </ClientTabsContent>

            <ClientTabsContent value="social" className="space-y-4">
              {loading ? (
                <div>Loading...</div>
              ) : filteredSocialAccounts.length > 0 ? (
                filteredSocialAccounts.map((account) => renderAccount(account, 'social'))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No LinkedIn accounts found
                </div>
              )}
            </ClientTabsContent>
          </ClientTabsRoot>
        </div>
      </div>
    </PageContainer>
  );
} 