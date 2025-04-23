'use client';

import { useState, useEffect, useContext } from 'react'; // Added useContext
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/PageContainer';
import { useForm } from 'react-hook-form'; // Added
import { zodResolver } from '@hookform/resolvers/zod'; // Added
import * as z from 'zod'; // Added
import { Sparkles, Pencil, Trash2 } from 'lucide-react'; // Added & Keep specific icon imports
import { useOrganization } from '@/contexts/OrganizationContext'; // Changed to useOrganization hook
// Direct imports instead of client-components aliases
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
/* Remove alias imports
import {
  ClientButton, // Replaced with Button
  ClientInput, // Replaced with Input
  ClientCard, // Replaced with Card
  ClientSwitch, // Replaced with Switch
  ClientTabsRoot, // Replaced with Tabs
  ClientTabsList, // Replaced with TabsList
  ClientTabsTrigger, // Replaced with TabsTrigger
  ClientTabsContent, // Replaced with TabsContent
  ClientPencilIcon, // Replaced with Pencil
  ClientTrashIcon, // Replaced with Trash2
  ClientSelect, // Replaced with Select
  ClientSelectTrigger, // Replaced with SelectTrigger
  ClientSelectValue, // Replaced with SelectValue
  ClientSelectContent, // Replaced with SelectContent
  ClientSelectItem, // Replaced with SelectItem
  ClientDialog, // Replaced with Dialog
  ClientDialogContent, // Replaced with DialogContent
  ClientDialogHeader, // Replaced with DialogHeader
  ClientDialogTitle, // Replaced with DialogTitle
  ClientDialogDescription, // Replaced with DialogDescription
  ClientDialogFooter, // Replaced with DialogFooter
  ClientForm, // Replaced with Form
  ClientFormField, // Replaced with FormField
  ClientFormItem, // Replaced with FormItem
  ClientFormLabel, // Replaced with FormLabel
  ClientFormControl, // Replaced with FormControl
  ClientFormMessage, // Replaced with FormMessage
  ClientTextarea // Replaced with Textarea
} from '@/components/ui/client-components';
*/ // This line was commented out, now uncommented

interface EmailAccount {
  id: string;
  name: string;
  email: string;
  unipileAccountId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isHidden?: boolean;
  // --- Add these fields ---
  dailySendLimit: number;
  dailySendCount: number;
  // -----------------------
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
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false); // Dialog state for modal
  const { currentOrganization } = useOrganization(); // Changed to useOrganization hook

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

  // Convert to explicit return function to fix ambiguous syntax
  const renderAccount = (account: EmailAccount | SocialAccount, type: 'email' | 'social') => {
    return (
      <Card key={account.id} className="p-4"> {/* ClientCard -> Card */}
        <div className="flex flex-col space-y-3">
          {/* Header with name and actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editingAccountId === account.id ? (
                <Input // ClientInput -> Input
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
                  <Button // ClientButton -> Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingAccountId(account.id);
                      setAccountName(account.name);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> {/* ClientPencilIcon -> Pencil */}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {account.isActive ? 'Active' : 'Inactive'}
                </span>
                <Switch // ClientSwitch -> Switch
                  checked={account.isActive}
                  onCheckedChange={() => handleToggleActive(account, type)}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              <Button // ClientButton -> Button
                variant="ghost" // Changed to ghost with text-destructive class for subtle red
                size="icon"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(account, type)}
                aria-label="Delete account"
              >
                <Trash2 className="h-4 w-4" /> {/* ClientTrashIcon -> Trash2 */}
              </Button>
            </div>
          </div>

          {/* Account details */}
          <div className="text-sm text-gray-500">
            {type === 'email'
              ? (
                <div className="flex flex-col space-y-1">
                  <span>{(account as EmailAccount).email}</span>
                  {/* --- Add this section --- */}
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground pt-1">
                    <span>Daily Sends:</span>
                    <span className="font-medium">{(account as EmailAccount).dailySendCount ?? 0}</span>
                    <span>/</span>
                    <span>{(account as EmailAccount).dailySendLimit ?? 'N/A'}</span>
                  </div>
                  {/* ----------------------- */}
                </div>
              )
              : <div className="flex flex-col space-y-1">
                </div>
            }
          </div>
            
          {/* Email account association dropdown for social accounts */}
          {type === 'social' && (
            <div className="mt-1">
              <Select // ClientSelect -> Select
                value={(account as SocialAccount).emailAccountId || "none"}
                onValueChange={(value) => handleAssociateEmail(account.id, value === "none" ? null : value)}
                disabled={updatingAssociation}
              >
                <SelectTrigger className="w-full h-9 text-sm"> {/* ClientSelectTrigger -> SelectTrigger */}
                  <SelectValue placeholder="Select an email account" /> {/* ClientSelectValue -> SelectValue */}
                </SelectTrigger>
                <SelectContent> {/* ClientSelectContent -> SelectContent */}
                  <SelectItem value="none"> {/* ClientSelectItem -> SelectItem */}
                    No association
                  </SelectItem>
                  {getAvailableEmailAccounts(account.id).map((email) => (
                    <SelectItem key={email.id} value={email.id}> {/* ClientSelectItem -> SelectItem */}
                      {email.name} ({email.email})
                    </SelectItem>
                  ))}
                  {/* If this social account already has an associated email that wouldn't be in the available list */}
                  {(account as SocialAccount).emailAccountId &&
                    !getAvailableEmailAccounts(account.id).some(email => email.id === (account as SocialAccount).emailAccountId) &&
                    emailAccounts.find(email => email.id === (account as SocialAccount).emailAccountId) && (
                      <SelectItem key={(account as SocialAccount).emailAccountId ?? 'current-assoc'} value={(account as SocialAccount).emailAccountId ?? 'none'}> {/* ClientSelectItem -> SelectItem */}
                        {emailAccounts.find(email => email.id === (account as SocialAccount).emailAccountId)?.name}
                        ({emailAccounts.find(email => email.id === (account as SocialAccount).emailAccountId)?.email})
                      </SelectItem>
                    )
                  }
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>
    );
  };

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
          <div className="flex items-center gap-2">
            <Button // ClientButton -> Button
              variant="brand-gradient-warm" // Use the specific warm gradient
              size="default"
              onClick={() => setIsSyncDialogOpen(true)}
            >
              AI Sync New Accounts
            </Button>
            <Button // ClientButton -> Button
              variant="brand-gradient-cold" // Use the cold gradient for Connect Account
              size="default"
              onClick={handleConnect}
            >
              Connect Account
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Input // ClientInput -> Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />

          <Tabs value={activeTab} onValueChange={setActiveTab}> {/* ClientTabsRoot -> Tabs */}
            <TabsList> {/* ClientTabsList -> TabsList */}
              <TabsTrigger value="email">Email Accounts</TabsTrigger> {/* ClientTabsTrigger -> TabsTrigger */}
              <TabsTrigger value="social">LinkedIn Accounts</TabsTrigger> {/* ClientTabsTrigger -> TabsTrigger */}
            </TabsList>

            <TabsContent value="email" className="space-y-4"> {/* ClientTabsContent -> TabsContent */}
              {loading ? (
                <div>Loading...</div>
              ) : filteredEmailAccounts.length > 0 ? (
                filteredEmailAccounts.map((account) => renderAccount(account, 'email'))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No email accounts found
                </div>
              )}
            </TabsContent>

            <TabsContent value="social" className="space-y-4"> {/* ClientTabsContent -> TabsContent */}
              {loading ? (
                <div>Loading...</div>
              ) : filteredSocialAccounts.length > 0 ? (
                filteredSocialAccounts.map((account) => renderAccount(account, 'social'))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No LinkedIn accounts found
                </div>
              )}
            </TabsContent>
          </Tabs> {/* ClientTabsRoot -> Tabs */}
        </div>
      </div>
      {/* Ultra-simple plain HTML modal */}
      {isSyncDialogOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '425px'
            }}
          >
            <h2 style={{ marginTop: 0 }}>AI Sync New Accounts</h2>
            <p style={{ color: 'gray' }}>Request the AI to discover and add new email accounts from MailReef.</p>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                // Simple form data handling
                const formData = new FormData(e.currentTarget);
                const numberOfAccounts = Number(formData.get('numberOfAccounts') || 1);
                const additionalRequirements = formData.get('additionalRequirements') as string || 'None';
                
                if (!currentOrganization?.id) {
                  toast.error('Organization information is missing. Cannot submit request.');
                  return;
                }
                
                // Create payload
                const payload = {
                  organizationId: currentOrganization.id,
                  numberOfAccounts: numberOfAccounts,
                  additionalRequirements: additionalRequirements
                };
                
                // Submit request
                fetch('https://n8n.srv768302.hstgr.cloud/webhook/new-accounts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                })
                .then(response => {
                  if (!response.ok) throw new Error('Failed to send sync request');
                  toast.success('Request received. We are working on adding the inboxes. Please check back in about 5 minutes.');
                  setIsSyncDialogOpen(false);
                })
                .catch(error => {
                  toast.error(error.message || 'An unexpected error occurred');
                });
              }}
            >
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  Number of New Inboxes to Add
                </label>
                <input 
                  type="number" 
                  name="numberOfAccounts" 
                  min="1" 
                  defaultValue="1" 
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  Additional Requirements (Optional)
                </label>
                <textarea 
                  name="additionalRequirements" 
                  placeholder="e.g., 'Only add accounts starting with sales@...'" 
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    minHeight: '80px'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <Button // ClientButton -> Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => setIsSyncDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button // ClientButton -> Button
                  type="submit"
                  variant="default"
                  size="default"
                >
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

// Component has been replaced with a simpler inline implementation
