'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Organization {
  id: string;
  webhookUrl: string;
  outboundWebhookUrl: string | null;
  locationId: string | null;
}

export default function WebhooksPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    // Fetch organization data
    fetch('/api/organizations/current')
      .then(res => res.json())
      .then(data => setOrganization(data))
      .catch(() => toast.error('Failed to load organization data'));
  }, []);

  if (!organization) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8">Webhook Settings</h1>
      
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Webhook Configuration</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="locationId">GoHighLevel Location ID</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="locationId"
                  defaultValue={organization.locationId || ''}
                  placeholder="Enter your GHL Location ID"
                  onChange={async (e) => {
                    try {
                      const response = await fetch(`/api/organizations/${organization.id}/location`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ locationId: e.target.value })
                      });
                      
                      if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.error || 'Failed to update location ID');
                      }
                      
                      toast.success('Location ID updated successfully');
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Failed to update location ID');
                    }
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Your GoHighLevel Location ID is required for webhook processing
              </p>
            </div>

            <div>
              <Label htmlFor="outboundUrl">Outbound Webhook URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="outboundUrl"
                  defaultValue={organization.outboundWebhookUrl || ''}
                  placeholder="Enter your outbound webhook URL"
                  onChange={async (e) => {
                    try {
                      const response = await fetch(`/api/organizations/${organization.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ outboundWebhookUrl: e.target.value })
                      });
                      
                      if (!response.ok) {
                        throw new Error('Failed to update outbound webhook URL');
                      }
                      
                      toast.success('Outbound webhook URL updated successfully');
                    } catch (error) {
                      toast.error('Failed to update outbound webhook URL');
                    }
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                ProfitReach will send processed webhooks to this URL
              </p>
            </div>

            <div>
              <Label htmlFor="inboundUrl">Inbound Webhook URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="inboundUrl"
                  value={organization.webhookUrl}
                  readOnly
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(organization.webhookUrl);
                    toast.success('Copied to clipboard');
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Use this URL in GoHighLevel to send webhooks to ProfitReach
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 