'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { Card as CardComponent } from '@/components/ui/card';
import { Input as InputComponent } from '@/components/ui/input';
import { Button as ButtonComponent } from '@/components/ui/button';
import { Label as LabelComponent } from '@/components/ui/label';
import { toast } from 'sonner';

// Component type aliases
const Card = CardComponent as any;
const Input = InputComponent as any;
const Button = ButtonComponent as any;
const Label = LabelComponent as any;

interface Organization {
  id: string;
  name: string;
  webhookUrl: string;
  outboundWebhookUrl: string | null;
}

export default function WebhooksPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrganization() {
      try {
        const response = await fetch('/api/organizations/current');
        if (!response.ok) {
          throw new Error('Failed to fetch organization');
        }
        const data = await response.json();
        setOrganization(data);
      } catch (error) {
        console.error('Error fetching organization:', error);
        toast.error('Failed to load organization data');
      } finally {
        setLoading(false);
      }
    }

    fetchOrganization();
  }, []);

  if (loading || !organization) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8">Webhook Settings</h1>
      
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Webhook URLs</h2>
          <div className="space-y-4">
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
                Use this URL in GoHighLevel to send webhooks to TempShift
              </p>
            </div>

            <div>
              <Label htmlFor="outboundUrl">Outbound Webhook URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="outboundUrl"
                  defaultValue={organization.outboundWebhookUrl || ''}
                  placeholder="Enter your outbound webhook URL"
                  onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                    const response = await fetch(`/api/organizations/current`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ outboundWebhookUrl: e.target.value })
                    });
                    if (!response.ok) {
                      toast.error('Failed to update outbound webhook URL');
                    } else {
                      toast.success('Outbound webhook URL updated');
                    }
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                TempShift will send processed webhooks to this URL
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 