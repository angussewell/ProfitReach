'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { GHLAuthButton } from '@/components/auth/GHLAuthButton';
import { useSession } from 'next-auth/react';
import { useOrganization } from '@/contexts/OrganizationContext';
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

// System fields that can be mapped
const SYSTEM_FIELDS = [
  { id: 'contactEmail', label: 'Contact Email', required: true },
  { id: 'contactFirstName', label: 'Contact First Name', required: false },
  { id: 'contactLastName', label: 'Contact Last Name', required: false },
  { id: 'scenarioName', label: 'Scenario Name', required: true },
  { id: 'leadStatus', label: 'Lead Status', required: false },
  { id: 'lifecycleStage', label: 'Lifecycle Stage', required: false },
  { id: 'userWebsite', label: 'User Website', required: false },
  { id: 'company', label: 'Company Name', required: false }
];

function normalizeFieldName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ghlIntegration, setGhlIntegration] = useState<any>(null);
  const [webhookFields, setWebhookFields] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [organization, setOrganization] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      if (!session?.user?.organizationId) {
        setLoading(false);
        return;
      }

      try {
        const [ghlResponse, orgResponse] = await Promise.all([
          fetch(`/api/ghl-integration?organizationId=${session.user.organizationId}`),
          fetch(`/api/organizations/${session.user.organizationId}`)
        ]);
        
        const [ghlData, orgData] = await Promise.all([
          ghlResponse.json(),
          orgResponse.json()
        ]);
        
        if (ghlData.error) {
          throw new Error(ghlData.error);
        }
        
        setGhlIntegration(ghlData.ghlIntegration);
        setOrganization(orgData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch organization data');
        setLoading(false);
      }
    }
    
    fetchData();
  }, [session?.user?.organizationId]);

  const handleDisconnect = async () => {
    if (!session?.user?.organizationId) {
      toast.error('No organization ID found');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/ghl-integration?organizationId=${session.user.organizationId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }
      
      setGhlIntegration(null);
      toast.success('Successfully disconnected from GoHighLevel');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect from GoHighLevel');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
          <div className="p-6">
            <div>Loading...</div>
          </div>
        </Card>
      </PageContainer>
    );
  }

  if (!session?.user?.organizationId) {
    return (
      <PageContainer>
        <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
          <div className="p-6">
            <div>Please select an organization to manage integrations.</div>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 mx-0 px-8 py-8 rounded-xl shadow-lg">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-300">Configure your application settings and integrations</p>
        </div>

        <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">GoHighLevel Integration</h2>
            
            {!ghlIntegration ? (
              <div>
                <p className="mb-4 text-slate-600">Connect your GoHighLevel account to get started.</p>
                <GHLAuthButton />
              </div>
            ) : (
              <div>
                <p className="text-green-600 mb-4">✓ Connected to GoHighLevel</p>
                <p className="text-sm text-slate-600 mb-2">Location: {ghlIntegration.locationName || 'Unknown'}</p>
                <Button
                  onClick={handleDisconnect}
                  variant="destructive"
                  disabled={saving}
                  className="bg-red-500 hover:bg-red-600 text-white transition-all duration-200 shadow-sm hover:shadow-md rounded-lg"
                >
                  {saving ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {ghlIntegration && (
          <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-[#2e475d] mb-4">Webhook Field Mappings</h2>
              <div className="space-y-4">
                {/* Add webhook field mapping UI here */}
              </div>
            </div>
          </Card>
        )}

        {/* Webhook URL Card */}
        <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
          <div className="p-6">
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
                <Button
                  onClick={() => {
                    if (organization?.webhookUrl) {
                      navigator.clipboard.writeText(`https://profit-reach.vercel.app/api/webhooks/${organization.webhookUrl}`);
                      toast.success('Webhook URL copied to clipboard');
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white"
                  disabled={!organization?.webhookUrl}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Check the <a href="/documentation/webhooks" className="text-red-500 hover:text-red-600">documentation</a> for more information on how to use webhooks.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
} 