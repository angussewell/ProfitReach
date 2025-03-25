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

interface CrmInfo {
  organizationId: string;
  private_integration_token: string | null;
  prospect_research: string | null;
  company_research: string | null;
  previous_message_copy: string | null;
  previous_message_subject_line: string | null;
  previous_message_id: string | null;
  thread_id: string | null;
  email_sender: string | null;
  original_outbound_rep_name: string | null;
  date_of_research: string | null;
  all_employees: string | null;
  provider_id: string | null;
  mutual_connections: string | null;
  additional_research: string | null;
  current_scenario: string | null;
  outbound_rep_name: string | null;
  lead_status: string | null;
  initial_linkedin_message_copy: string | null;
  linkedin_user_provider_id: string | null;
  title_field_id: string | null;
  linkedin_profile_photo_field_id: string | null;
  linkedin_posts_field_id: string | null;
}

// Define a type for field entries with optional section property
type FieldEntry = {
  key: keyof CrmInfo;
  label: string;
  section?: string;
};

export default function CRMSettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [crmInfo, setCrmInfo] = useState<CrmInfo | null>(null);
  const [editedCrmInfo, setEditedCrmInfo] = useState<CrmInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch organization
        const orgResponse = await fetch('/api/organizations/current');
        if (!orgResponse.ok) {
          throw new Error('Failed to fetch organization');
        }
        const orgData = await orgResponse.json();
        setOrganization(orgData);

        // Fetch CRM info
        const crmResponse = await fetch(`/api/organizations/${orgData.id}/crm-info`);
        if (!crmResponse.ok) {
          throw new Error('Failed to fetch CRM info');
        }
        const crmData = await crmResponse.json();
        const initialData = crmData || {
          organizationId: '',
          private_integration_token: null,
          prospect_research: null,
          company_research: null,
          previous_message_copy: null,
          previous_message_subject_line: null,
          previous_message_id: null,
          thread_id: null,
          email_sender: null,
          original_outbound_rep_name: null,
          date_of_research: null,
          all_employees: null,
          provider_id: null,
          mutual_connections: null,
          additional_research: null,
          current_scenario: null,
          outbound_rep_name: null,
          lead_status: null,
          initial_linkedin_message_copy: null,
          linkedin_user_provider_id: null,
          title_field_id: null,
          linkedin_profile_photo_field_id: null,
          linkedin_posts_field_id: null,
        };
        setCrmInfo(initialData);
        setEditedCrmInfo(initialData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleFieldChange = (field: keyof CrmInfo, value: string) => {
    setEditedCrmInfo(prev => {
      if (!prev) return null;
      const updated = { ...prev, [field]: value };
      
      // Compare with original to see if there are changes
      const hasAnyChanges = Object.keys(updated).some(
        key => updated[key as keyof CrmInfo] !== crmInfo?.[key as keyof CrmInfo]
      );
      setHasChanges(hasAnyChanges);
      
      return updated;
    });
  };

  const saveAllChanges = async () => {
    if (!organization || !editedCrmInfo) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/organizations/${organization.id}/crm-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedCrmInfo)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from API:', errorData);
        throw new Error(errorData.details || 'Failed to update CRM info');
      }

      const updatedData = await response.json();
      setCrmInfo(updatedData);
      setEditedCrmInfo(updatedData);
      setHasChanges(false);
      toast.success('CRM settings saved successfully');
    } catch (error) {
      console.error('Error updating CRM info:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update CRM info');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !organization || !editedCrmInfo) {
    return <div>Loading...</div>;
  }

  const fields: FieldEntry[] = [
    { key: 'private_integration_token', label: 'Private Integration Token' },
    { key: 'prospect_research', label: 'Prospect Research Field ID' },
    { key: 'company_research', label: 'Company Research Field ID' },
    { key: 'previous_message_copy', label: 'Previous Message Copy Field ID' },
    { key: 'previous_message_subject_line', label: 'Previous Message Subject Line Field ID' },
    { key: 'previous_message_id', label: 'Previous Message ID Field ID' },
    { key: 'thread_id', label: 'Thread ID Field ID' },
    { key: 'email_sender', label: 'Email Sender Field ID' },
    { key: 'original_outbound_rep_name', label: 'Original Outbound Rep Name Field ID' },
    { key: 'date_of_research', label: 'Date of Research Field ID' },
    { key: 'all_employees', label: 'All Employees Field ID' },
    { key: 'provider_id', label: 'Provider ID Field ID' },
    { key: 'mutual_connections', label: 'Mutual Connections Field ID' },
    { key: 'additional_research', label: 'Additional Research Field ID' },
    { key: 'current_scenario', label: 'Current Scenario Field ID' },
    { key: 'outbound_rep_name', label: 'Outbound Rep Name Field ID' },
    { key: 'lead_status', label: 'Lead Status Field ID' },
    { key: 'title_field_id', label: 'Title Field ID' },
    { key: 'linkedin_profile_photo_field_id', label: 'LinkedIn Profile Photo Field ID' },
    { key: 'initial_linkedin_message_copy', label: 'Initial LinkedIn Message Copy Field ID' },
    { key: 'linkedin_posts_field_id', label: 'LinkedIn Posts Field ID' },
    { key: 'linkedin_user_provider_id', label: 'LinkedIn User Provider ID', section: 'LinkedIn Provider Settings' }
  ];

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

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">CRM Field Mappings</h2>
          <p className="text-sm text-gray-500 mb-4">
            Enter the custom field IDs from your CRM that correspond to each field below
          </p>
          <div className="space-y-4">
            {fields.map(({ key, label, section }) => (
              <div key={key}>
                {section && (
                  <div className="mt-6 mb-4">
                    <div className="border-t border-gray-200 my-2"></div>
                    <h3 className="font-medium text-gray-700">{section}</h3>
                  </div>
                )}
                <Label htmlFor={key}>{label}</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id={key}
                    value={editedCrmInfo[key] || ''}
                    placeholder={`Enter ${label}`}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleFieldChange(key, e.target.value)}
                    className={key === 'linkedin_user_provider_id' ? 'bg-blue-50' : ''}
                  />
                </div>
                {key === 'linkedin_user_provider_id' && (
                  <p className="text-xs text-gray-500 mt-1">
                    This is not a field ID. Enter the actual LinkedIn provider ID value.
                  </p>
                )}
              </div>
            ))}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveAllChanges}
                disabled={isSaving || !hasChanges}
                className={`bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors ${
                  (isSaving || !hasChanges) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin">⟳</div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 