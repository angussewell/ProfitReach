'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/PageContainer';

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

export default function SettingsPage() {
  const [organization, setOrganization] = useState<any>(null);
  const [syncState, setSyncState] = useState<'idle' | 'waiting' | 'synced'>('idle');

  // Fetch organization data on mount
  useEffect(() => {
    fetch('/api/organizations/current')
      .then(res => res.json())
      .then(data => setOrganization(data))
      .catch(err => {
        console.error('Error fetching organization:', err);
        toast.error('Failed to fetch organization data');
      });
  }, []);

  // Listen for webhook field registration events
  useEffect(() => {
    if (syncState !== 'waiting') return;

    const checkForFields = async () => {
      try {
        const response = await fetch('/api/webhook-fields');
        if (!response.ok) throw new Error('Failed to fetch fields');
        
        const fields = await response.json();
        if (fields.length > 0) {
          setSyncState('synced');
          toast.success('Fields have been registered!');
        }
      } catch (error) {
        console.error('Error checking fields:', error);
      }
    };

    // Check every 5 seconds while waiting
    const interval = setInterval(checkForFields, 5000);
    return () => clearInterval(interval);
  }, [syncState]);

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 mx-0 px-8 py-8 rounded-xl shadow-lg">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-300">Configure your application settings and integrations</p>
        </div>

        {/* Webhook Field Sync Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-[#2e475d] mb-4">Webhook Field Sync</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Click the button below to sync webhook fields. Post data to your webhook URL and we'll automatically register the fields.
            </p>
            <button
              onClick={() => setSyncState('waiting')}
              disabled={syncState !== 'idle' || !organization?.webhookUrl}
              className={`px-4 py-2 rounded-lg text-white transition-colors ${
                syncState === 'waiting'
                  ? 'bg-yellow-500'
                  : syncState === 'synced'
                  ? 'bg-green-500'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {syncState === 'waiting' 
                ? 'Waiting for data...' 
                : syncState === 'synced'
                ? 'Fields synced!'
                : 'Sync Fields'}
            </button>
            {syncState === 'waiting' && (
              <p className="text-sm text-yellow-600">
                Post data to your webhook URL below. We'll automatically register any fields we receive.
              </p>
            )}
            {syncState === 'synced' && (
              <p className="text-sm text-green-600">
                Fields have been registered! You can now use them in your scenarios.
              </p>
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
                value={organization ? `https://profit-reach.vercel.app/api/webhooks/${organization.webhookUrl}` : 'Loading...'}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600"
              />
              <button
                onClick={() => {
                  if (organization?.webhookUrl) {
                    navigator.clipboard.writeText(`https://profit-reach.vercel.app/api/webhooks/${organization.webhookUrl}`);
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
      </div>
    </PageContainer>
  );
} 