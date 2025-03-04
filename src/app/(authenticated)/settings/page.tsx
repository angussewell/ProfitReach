'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/PageContainer';
import { UserManagement } from '@/components/settings/user-management';
import { BillingForm } from '@/app/settings/billing/billing-form';
import { CrmSettings } from '@/components/settings/crm-settings';

interface Organization {
  id: string;
  name: string;
  webhookUrl: string;
  outboundWebhookUrl: string | null;
  location_id: string | null;
  billingPlan: string;
  creditBalance: number;
  creditUsage: Array<{
    id: string;
    amount: number;
    description: string | null;
    createdAt: Date;
  }>;
  connectedAccounts: Array<{
    id: string;
    accountType: string;
    accountId: string;
  }>;
}

interface WebhookSettingsProps {
  organization: Organization | null;
  isWaitingForData: boolean;
  setIsWaitingForData: (value: boolean) => void;
  outboundWebhookUrl: string;
  setOutboundWebhookUrl: (value: string) => void;
  urlError: string;
  setUrlError: (value: string) => void;
  isSavingWebhookUrl: boolean;
  handleOutboundWebhookUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveWebhookUrl: () => Promise<void>;
}

// Pre-configured templates
const WEBHOOK_TEMPLATES = {
  make: {
    contactEmail: '{email}',
    contactFirstName: '{first_name}',
    contactLastName: '{last_name}',
    scenarioName: 'make_sequence',
    leadStatus: 'lead_status',
    lifecycleStage: 'lifecycle_stage',
    userWebsite: 'website',
    company: '{company}'
  }
};

const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const WebhookSettings = ({ organization, isWaitingForData, setIsWaitingForData, outboundWebhookUrl, setOutboundWebhookUrl, urlError, setUrlError, isSavingWebhookUrl, handleOutboundWebhookUrlChange, handleSaveWebhookUrl }: WebhookSettingsProps) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Webhook Field Sync Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-[#2e475d] mb-4">Webhook Field Sync</h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Post data to your webhook URL below and we'll automatically register any fields we receive.
          </p>
          <button
            onClick={() => setIsWaitingForData(true)}
            disabled={isWaitingForData || !organization?.webhookUrl}
            className={`px-4 py-2 rounded-lg text-white transition-colors ${
              isWaitingForData
                ? 'bg-yellow-500'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isWaitingForData ? 'Send data to webhook URL below →' : 'Start Field Sync'}
          </button>
          {isWaitingForData && (
            <div className="space-y-2">
              <p className="text-sm text-yellow-600">
                1. Send a webhook to your URL below to register fields
              </p>
              <p className="text-sm text-yellow-600">
                2. After sending data, refresh the page to see registered fields
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Webhook URL Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-[#2e475d] mb-4">Webhook URL</h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Use this URL to send contact data to your organization. This URL is unique to your organization and should be kept secure.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={organization ? `https://app.messagelm.com/api/webhooks/${organization.webhookUrl}` : 'Loading...'}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600"
            />
            <button
              onClick={() => {
                if (organization?.webhookUrl) {
                  navigator.clipboard.writeText(`https://app.messagelm.com/api/webhooks/${organization.webhookUrl}`);
                  toast.success('Webhook URL copied to clipboard');
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              disabled={!organization?.webhookUrl}
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Check the <a href="/documentation/webhooks" className="text-red-500 hover:text-red-600">documentation</a> for more information on how to use webhooks.
          </p>
        </div>
      </div>

      {/* Outbound Webhook URL Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-[#2e475d] mb-4">Outbound Webhook URL</h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the URL where you want to receive processed webhook data. This URL will receive the contact data after it has been processed by our system.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={outboundWebhookUrl}
                onChange={handleOutboundWebhookUrlChange}
                placeholder="Enter your outbound webhook URL"
                className={`w-full px-3 py-2 border rounded-md text-sm text-gray-600 ${
                  urlError ? 'border-red-300' : 'border-gray-200'
                }`}
              />
            </div>
            <button
              onClick={handleSaveWebhookUrl}
              disabled={Boolean(isSavingWebhookUrl || (outboundWebhookUrl && !isValidUrl(outboundWebhookUrl)))}
              className={`px-4 py-2 rounded-lg text-white transition-colors ${
                isSavingWebhookUrl || (outboundWebhookUrl && !isValidUrl(outboundWebhookUrl))
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isSavingWebhookUrl ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin">⟳</div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save URL'
              )}
            </button>
          </div>
          {urlError ? (
            <p className="text-xs text-red-500">{urlError}</p>
          ) : (
            <p className="text-xs text-gray-500">
              The outbound webhook will send processed contact data, scenario information, and prompt data to this URL.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('webhooks');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWaitingForData, setIsWaitingForData] = useState(false);
  const [isSavingWebhookUrl, setIsSavingWebhookUrl] = useState(false);
  const [outboundWebhookUrl, setOutboundWebhookUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  const fetchOrganization = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/organizations/current');
      if (!res.ok) {
        throw new Error('Failed to fetch organization data');
      }
      const data = await res.json();
      setOrganization(data);
      setOutboundWebhookUrl(data.outboundWebhookUrl || '');
    } catch (err) {
      console.error('Error fetching organization:', err);
      toast.error('Failed to fetch organization data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set initial tab from URL parameter
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['webhooks', 'users', 'billing', 'crm'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    fetchOrganization();
  }, []);

  const handlePlanChange = async (plan: string) => {
    await fetchOrganization();
  };

  const handleOutboundWebhookUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setOutboundWebhookUrl(newUrl);
    
    if (newUrl && !isValidUrl(newUrl)) {
      setUrlError('Please enter a valid URL');
      return;
    }
    
    setUrlError('');
  };

  const handleSaveWebhookUrl = async () => {
    if (outboundWebhookUrl && !isValidUrl(outboundWebhookUrl)) {
      setUrlError('Please enter a valid URL');
      return;
    }

    setIsSavingWebhookUrl(true);
    try {
      const response = await fetch('/api/organizations/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outboundWebhookUrl: outboundWebhookUrl || null })
      });
      
      if (!response.ok) throw new Error('Failed to save outbound webhook URL');
      
      const updatedOrg = await response.json();
      setOrganization(updatedOrg);
      toast.success('Outbound webhook URL saved successfully');
      setUrlError('');
    } catch (err) {
      console.error('Error saving outbound webhook URL:', err);
      toast.error('Failed to save outbound webhook URL');
    } finally {
      setIsSavingWebhookUrl(false);
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`px-4 py-2 ${
              activeTab === 'webhooks'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Webhooks
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 ${
              activeTab === 'users'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2 ${
              activeTab === 'billing'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Billing
          </button>
          <button
            onClick={() => setActiveTab('crm')}
            className={`px-4 py-2 ${
              activeTab === 'crm'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            CRM
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin text-red-500">⟳</div>
          </div>
        ) : (
          <>
            {activeTab === 'webhooks' && organization && (
              <WebhookSettings
                organization={organization}
                isWaitingForData={isWaitingForData}
                setIsWaitingForData={setIsWaitingForData}
                outboundWebhookUrl={outboundWebhookUrl}
                setOutboundWebhookUrl={setOutboundWebhookUrl}
                urlError={urlError}
                setUrlError={setUrlError}
                isSavingWebhookUrl={isSavingWebhookUrl}
                handleOutboundWebhookUrlChange={handleOutboundWebhookUrlChange}
                handleSaveWebhookUrl={handleSaveWebhookUrl}
              />
            )}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'billing' && organization && (
              <BillingForm organization={organization} onPlanChange={handlePlanChange} />
            )}
            {activeTab === 'crm' && organization && (
              <CrmSettings
                organization={organization}
                onLocationIdChange={async (newLocationId) => {
                  try {
                    const response = await fetch('/api/organizations/current', {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ location_id: newLocationId }),
                    });
                    
                    const data = await response.json();
                    
                    if (!response.ok) {
                      throw new Error(data.error || 'Failed to update location ID');
                    }
                    
                    setOrganization(prev => prev ? {
                      ...prev,
                      location_id: data.location_id
                    } : null);
                    
                    toast.success('Location ID updated successfully');
                  } catch (error) {
                    console.error('Error updating location ID:', error);
                    toast.error(error instanceof Error ? error.message : 'Failed to update location ID');
                  }
                }}
              />
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
} 