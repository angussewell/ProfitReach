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
  ClientCheckbox,
  ClientSwitch,
} from '@/components/ui/client-components';
import {
  ClientUploadIcon,
  ClientPlusIcon,
  ClientSearchIcon,
  ClientXIcon,
} from '@/components/ui/client-icons';
import { toast } from 'sonner';
import { emailAccountsTemplate } from '@/lib/csv-templates/email-accounts';

interface EmailAccount {
  id: string;
  name: string;  // Sender name for outgoing emails
  email: string;
  accountType: string;
  isGmail: boolean;
  incomingServer?: string;
  incomingServerPort?: number;
  incomingPassword?: string;
  outgoingServer?: string;
  outgoingServerPort?: number;
  outgoingPassword?: string;
  smtpConnection?: number;
  sslEnabled?: boolean;
  startTls?: boolean;
  saveSentCopy?: boolean;
  syncFromDate?: string;
  isActive?: boolean;
}

export function EmailAccountsClient() {
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted', editingAccount);
    if (!editingAccount) return;

    try {
      const baseUrl = window.location.origin;
      console.log('Submitting to:', `${baseUrl}/api/email-accounts${editingAccount.id ? `/${editingAccount.id}` : ''}`);
      
      // Transform the data for Mail360
      const apiPayload = {
        ...editingAccount,
        password: editingAccount.incomingPassword,
        // For Gmail accounts, set default server settings
        ...(editingAccount.isGmail && {
          incomingServer: 'imap.gmail.com',
          incomingServerPort: 993,
          outgoingServer: 'smtp.gmail.com',
          outgoingServerPort: 465,
          smtpConnection: 1,
          sslEnabled: true,
          startTls: false,
          // Use email as username for Gmail
          incomingUser: editingAccount.email,
          outgoingUser: editingAccount.email,
          // Use the same password for both
          outgoingPassword: editingAccount.incomingPassword
        }),
        // For non-Gmail accounts, ensure we have all required fields
        ...(!editingAccount.isGmail && {
          incomingUser: editingAccount.email,
          outgoingUser: editingAccount.email,
          outgoingPassword: editingAccount.incomingPassword,
          smtpConnection: 1,
          sslEnabled: true,
          startTls: false
        })
      };
      
      const response = await fetch(`${baseUrl}/api/email-accounts` + (editingAccount.id ? `/${editingAccount.id}` : ''), {
        method: editingAccount.id ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        });
        throw new Error(errorData.error || 'Failed to save email account');
      }

      const data = await response.json();
      console.log('Response:', {
        status: response.status,
        ok: response.ok,
        data
      });
      
      toast.success('Email account saved successfully');
      setEditingAccount(null);
      fetchEmailAccounts();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save email account';
      
      // Show error in toast with proper formatting
      if (message.includes('\n')) {
        // For multi-line errors (like validation errors), show each line as a separate bullet point
        const lines = message.split('\n').filter(Boolean);
        toast.error(
          <div>
            {lines.map((line, i) => (
              <div key={i} className="mb-1">
                {i === 0 ? line : `• ${line}`}
              </div>
            ))}
          </div>
        );
      } else {
        toast.error(message);
      }
      
      console.error('Error saving email account:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        account: {
          email: editingAccount.email,
          isGmail: editingAccount.isGmail,
          servers: {
            incoming: editingAccount.incomingServer,
            outgoing: editingAccount.outgoingServer
          }
        }
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const errors: Array<{ email: string, error: string }> = [];
    try {
      const text = await file.text();
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
      const headers = rows[0];

      // Skip header row
      const dataRows = rows.slice(1).filter(row => row.length === headers.length);
      
      let successCount = 0;
      let errorCount = 0;

      for (const row of dataRows) {
        try {
          const rowData = Object.fromEntries(
            headers.map((header, index) => [header, row[index]])
          );

          // Map CSV fields to match the API schema
          const accountData = {
            email: rowData['Email'] || rowData['email'],
            name: `${rowData['First Name'] || ''} ${rowData['Last Name'] || ''}`.trim() || 'Unknown',
            incomingPassword: rowData['IMAP Password'],
            isGmail: (rowData['IMAP Host'] || '').toLowerCase().includes('gmail.com'),
            isActive: true,
            incomingServer: rowData['IMAP Host'],
            incomingServerPort: parseInt(rowData['IMAP Port']),
            outgoingServer: rowData['SMTP Host'],
            outgoingServerPort: parseInt(rowData['SMTP Port']),
            smtpConnection: 1 // Default to SSL for non-Gmail accounts
          };

          const baseUrl = window.location.origin;
          console.log('Sending account data:', {
            ...accountData,
            incomingPassword: '***'
          });
          
          const response = await fetch(`${baseUrl}/api/email-accounts`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(accountData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to create account for ${accountData.email}`);
          }

          successCount++;
        } catch (error) {
          console.error('Error creating account from CSV row:', error);
          errorCount++;
          errors.push({
            email: row[headers.indexOf('email') || headers.indexOf('Email')],
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} accounts`);
        fetchEmailAccounts();
      }
      if (errorCount > 0) {
        // Show detailed error information
        toast.error(
          <div>
            <div>Failed to create {errorCount} accounts:</div>
            {errors.map((error, index) => (
              <div key={index} className="mt-1 text-sm">
                • {error.email}: {error.error}
              </div>
            ))}
          </div>
        );
      }
    } catch (error) {
      console.error('Error processing CSV:', error);
      toast.error('Failed to process CSV file');
    } finally {
      setUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const filteredAccounts = accounts.filter(account => 
    account.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContainer>
      <PageHeader
        title="Email Accounts"
        description="Manage your email accounts for outbound communication"
      >
        <div className="flex items-center gap-4">
          <input
            id="bulk-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <label
            htmlFor="bulk-upload"
            className={`technical-button inline-flex items-center ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ClientUploadIcon className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Bulk Upload'}
          </label>
          <ClientButton 
            onClick={() => setEditingAccount({ 
              id: '', 
              name: '',
              email: '', 
              accountType: '',
              isGmail: false 
            })}
            disabled={uploading}
          >
            <ClientPlusIcon className="w-4 h-4 mr-2" />
            New Email Account
          </ClientButton>
        </div>
      </PageHeader>

      <div className="relative max-w-2xl">
        <ClientSearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <ClientInput
          className="technical-input pl-10"
          placeholder="Search email accounts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4 mt-6">
        {loading ? (
          [1, 2, 3].map((i) => (
            <ClientCard key={i} className="p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded" />
              </div>
            </ClientCard>
          ))
        ) : filteredAccounts.length === 0 ? (
          <ClientCard className="p-6 text-center text-muted-foreground">
            No email accounts found
          </ClientCard>
        ) : (
          filteredAccounts.map(account => (
            <ClientCard key={account.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{account.email}</h3>
                  <p className="text-sm text-muted-foreground">
                    {account.accountType} {account.isGmail && '(Gmail)'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Active</label>
                    <ClientSwitch
                      checked={account.isActive}
                      onCheckedChange={async (checked) => {
                        try {
                          const baseUrl = window.location.origin;
                          const response = await fetch(`${baseUrl}/api/email-accounts/${account.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ isActive: checked }),
                          });
                          
                          if (!response.ok) {
                            throw new Error('Failed to update account status');
                          }
                          
                          setAccounts(accounts.map(a => 
                            a.id === account.id ? { ...a, isActive: checked } : a
                          ));
                          
                          toast.success('Account status updated');
                        } catch (error) {
                          console.error('Error updating account status:', error);
                          toast.error('Failed to update account status');
                        }
                      }}
                    />
                  </div>
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
                    onClick={async () => {
                      if (!confirm('Are you sure you want to delete this account?')) return;
                      
                      try {
                        const baseUrl = window.location.origin;
                        const response = await fetch(`${baseUrl}/api/email-accounts/${account.id}`, {
                          method: 'DELETE',
                          credentials: 'include',
                        });
                        
                        if (!response.ok) {
                          throw new Error('Failed to delete account');
                        }
                        
                        setAccounts(accounts.filter(a => a.id !== account.id));
                        toast.success('Account deleted');
                      } catch (error) {
                        console.error('Error deleting account:', error);
                        toast.error('Failed to delete account');
                      }
                    }}
                  >
                    Delete
                  </ClientButton>
                </div>
              </div>
            </ClientCard>
          ))
        )}
      </div>

      {editingAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ClientCard className="w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editingAccount.id ? 'Edit Email Account' : 'New Email Account'}
                </h2>
                <ClientButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingAccount(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ClientXIcon className="w-5 h-5" />
                </ClientButton>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Sender Name</label>
                  <ClientInput
                    required
                    type="text"
                    value={editingAccount.name}
                    onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                    placeholder="Your name (e.g. John Smith)"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    This name will appear as the sender name in outgoing emails
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <ClientInput
                    required
                    type="email"
                    value={editingAccount.email}
                    onChange={(e) => setEditingAccount({ ...editingAccount, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Account Type</label>
                  <ClientSelect
                    value={editingAccount.accountType}
                    onValueChange={(value) => {
                      const isGmail = value === 'gmail';
                      setEditingAccount({
                        ...editingAccount,
                        accountType: value,
                        isGmail,
                        // Set Gmail defaults if selected
                        ...(isGmail && {
                          incomingServer: 'imap.gmail.com',
                          incomingServerPort: 993,
                          outgoingServer: 'smtp.gmail.com',
                          outgoingServerPort: 587,
                          smtpConnection: 2, // TLS for Gmail
                          sslEnabled: true,
                          startTls: true
                        })
                      });
                    }}
                  >
                    <ClientSelectTrigger>
                      <ClientSelectValue placeholder="Select account type" />
                    </ClientSelectTrigger>
                    <ClientSelectContent>
                      <ClientSelectItem value="gmail">Gmail</ClientSelectItem>
                      <ClientSelectItem value="outlook">Outlook</ClientSelectItem>
                      <ClientSelectItem value="other">Other</ClientSelectItem>
                    </ClientSelectContent>
                  </ClientSelect>
                  {editingAccount.accountType === 'gmail' && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      For Gmail accounts, you need to use an App Password. 
                      <a 
                        href="https://support.google.com/accounts/answer/185833"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-primary hover:underline"
                      >
                        Learn how to create one
                      </a>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Email Password {editingAccount.accountType === 'gmail' && '(App Password)'}</label>
                  <ClientInput
                    required
                    type="password"
                    value={editingAccount.incomingPassword || ''}
                    onChange={(e) => {
                      const password = e.target.value;
                      setEditingAccount({
                        ...editingAccount,
                        incomingPassword: password,
                        outgoingPassword: password // Keep both passwords in sync
                      });
                    }}
                    placeholder={editingAccount.accountType === 'gmail' ? 'Enter your Gmail App Password' : 'Enter your email password'}
                  />
                </div>

                {!editingAccount.isGmail && (
                  <>
                    <div className="grid gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Incoming Mail Server (IMAP)</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-muted-foreground">Server</label>
                            <ClientInput
                              required
                              value={editingAccount.incomingServer || ''}
                              onChange={(e) => setEditingAccount({ ...editingAccount, incomingServer: e.target.value })}
                              placeholder="e.g., imap.example.com"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">Port</label>
                            <ClientInput
                              required
                              type="number"
                              value={editingAccount.incomingServerPort || ''}
                              onChange={(e) => setEditingAccount({ ...editingAccount, incomingServerPort: parseInt(e.target.value) })}
                              placeholder="993"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium mb-2">Outgoing Mail Server (SMTP)</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-muted-foreground">Server</label>
                            <ClientInput
                              required
                              value={editingAccount.outgoingServer || ''}
                              onChange={(e) => setEditingAccount({ ...editingAccount, outgoingServer: e.target.value })}
                              placeholder="e.g., smtp.example.com"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">Port</label>
                            <ClientInput
                              required
                              type="number"
                              value={editingAccount.outgoingServerPort || ''}
                              onChange={(e) => setEditingAccount({ ...editingAccount, outgoingServerPort: parseInt(e.target.value) })}
                              placeholder="587"
                            />
                          </div>
                        </div>

                        <div className="mt-2">
                          <label className="text-sm text-muted-foreground">Security</label>
                          <ClientSelect
                            value={String(editingAccount.smtpConnection || 1)}
                            onValueChange={(value) => {
                              const connection = parseInt(value);
                              setEditingAccount({
                                ...editingAccount,
                                smtpConnection: connection,
                                startTls: connection === 2,
                                sslEnabled: connection === 1
                              });
                            }}
                          >
                            <ClientSelectTrigger>
                              <ClientSelectValue placeholder="Select security type" />
                            </ClientSelectTrigger>
                            <ClientSelectContent>
                              <ClientSelectItem value="0">None</ClientSelectItem>
                              <ClientSelectItem value="1">SSL/TLS</ClientSelectItem>
                              <ClientSelectItem value="2">STARTTLS</ClientSelectItem>
                            </ClientSelectContent>
                          </ClientSelect>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-4">
                  <h3 className="font-medium">Additional Settings</h3>
                  <div className="flex items-center space-x-2">
                    <ClientCheckbox
                      id="saveSentCopy"
                      checked={editingAccount.saveSentCopy}
                      onCheckedChange={(checked) => setEditingAccount({ ...editingAccount, saveSentCopy: checked as boolean })}
                    />
                    <label htmlFor="saveSentCopy" className="text-sm">Save copy of sent emails</label>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Sync emails from date</label>
                    <ClientInput
                      type="datetime-local"
                      value={editingAccount.syncFromDate || new Date().toISOString().slice(0, 16)}
                      onChange={(e) => setEditingAccount({ ...editingAccount, syncFromDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
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
    </PageContainer>
  );
} 