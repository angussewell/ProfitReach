'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { Card as CardComponent } from '@/components/ui/card';
import { Input as InputComponent } from '@/components/ui/input';
import { Label as LabelComponent } from '@/components/ui/label';
import { toast } from 'sonner';

// Component type aliases
const Card = CardComponent as any;
const Input = InputComponent as any;
const Label = LabelComponent as any;

interface Organization {
  id: string;
  name: string;
  locationId: string | null;
}

export default function CRMSettingsPage() {
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
      <h1 className="text-2xl font-bold mb-8">CRM Settings</h1>
      
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">GoHighLevel Integration</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="locationId">Location ID</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="locationId"
                  defaultValue={organization.locationId || ''}
                  placeholder="Enter your GHL Location ID"
                  onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                    const response = await fetch(`/api/organizations/${organization.id}/ghl-integration`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ locationId: e.target.value })
                    });
                    
                    if (!response.ok) {
                      const data = await response.json();
                      toast.error(data.error || 'Failed to update location ID');
                    } else {
                      toast.success('Location ID updated successfully');
                      // Update local state
                      setOrganization(prev => prev ? {
                        ...prev,
                        locationId: e.target.value
                      } : null);
                    }
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Your GoHighLevel Location ID is required for CRM integration
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 