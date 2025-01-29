'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { GHLAuthButton } from '@/components/auth/GHLAuthButton';
import { useSession } from 'next-auth/react';
import { useOrganization } from '@/contexts/OrganizationContext';

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

  useEffect(() => {
    async function fetchData() {
      if (!session?.user?.organizationId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/ghl-integration?organizationId=${session.user.organizationId}`);
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setGhlIntegration(data.ghlIntegration);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching GHL integration:', error);
        toast.error('Failed to fetch GHL integration status');
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
      <div className="p-4">
        <Card className="p-6">
          <div>Loading...</div>
        </Card>
      </div>
    );
  }

  if (!session?.user?.organizationId) {
    return (
      <div className="p-4">
        <Card className="p-6">
          <div>Please select an organization to manage integrations.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">GoHighLevel Integration</h2>
        
        {!ghlIntegration ? (
          <div>
            <p className="mb-4">Connect your GoHighLevel account to get started.</p>
            <GHLAuthButton />
          </div>
        ) : (
          <div>
            <p className="text-green-600 mb-4">✓ Connected to GoHighLevel</p>
            <p className="text-sm text-gray-600 mb-2">Location: {ghlIntegration.locationName || 'Unknown'}</p>
            <Button
              onClick={handleDisconnect}
              variant="destructive"
              disabled={saving}
            >
              {saving ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </div>
        )}
      </Card>

      {ghlIntegration && (
        <Card className="mt-4 p-6">
          <h2 className="text-2xl font-bold mb-4">Webhook Field Mappings</h2>
          <div className="space-y-4">
            {/* Add webhook field mapping UI here */}
          </div>
        </Card>
      )}
    </div>
  );
} 