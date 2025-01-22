'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SearchableSelect } from "@/components/ui/searchable-select";

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

const normalizeFieldName = (field: string) => field.toLowerCase().replace(/[^a-z0-9]/g, '');

export default function SettingsPage() {
  const [webhookFields, setWebhookFields] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchWebhookFields = async () => {
    try {
      console.log('Fetching webhook fields...');
      const response = await fetch('/api/webhook-fields', {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch webhook fields');
      const fields = await response.json();
      console.log('Received webhook fields:', fields);
      setWebhookFields(prev => {
        console.log('Updating webhook fields state:', { prev, new: fields });
        return fields;
      });
      toast.success(`Loaded ${fields.length} webhook fields`);
    } catch (error) {
      toast.error('Failed to load webhook fields');
      console.error('Error fetching webhook fields:', error);
    }
  };

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/field-mappings');
      if (!response.ok) throw new Error('Failed to fetch field mappings');
      const data = await response.json();
      const newMappings: Record<string, string> = {};
      
      // Find matching system field from SYSTEM_FIELDS
      data.forEach((mapping: any) => {
        const systemField = SYSTEM_FIELDS.find(
          field => normalizeFieldName(field.id) === mapping.systemField
        );
        if (systemField) {
          newMappings[systemField.id] = mapping.webhookField;
        }
      });
      
      setMappings(newMappings);
    } catch (error) {
      toast.error('Failed to load field mappings');
      console.error('Error fetching field mappings:', error);
    }
  };

  useEffect(() => {
    fetchWebhookFields();
    fetchMappings();
  }, []); // Initial load

  const handleRefresh = async () => {
    console.log('Refreshing webhook fields...');
    await fetchWebhookFields();
    console.log('Webhook fields refresh complete');
  };

  // Update local state
  const handleFieldChange = async (systemField: string, webhookField: string) => {
    try {
      console.log('Updating field mapping:', { systemField, webhookField });
      
      // Save to backend
      const response = await fetch('/api/field-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          systemField, 
          webhookField 
        })
      });

      if (!response.ok) {
        console.error('Failed to update mapping:', response.status);
        throw new Error('Failed to update mapping');
      }
      
      // Update local state with original value for display
      setMappings(prev => ({
        ...prev,
        [systemField]: webhookField
      }));

      toast.success('Field mapping updated');
    } catch (error) {
      console.error('Error updating field mapping:', error);
      toast.error('Failed to update field mapping');
    }
  };

  // Save all changes
  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Saving mappings:', mappings);
      
      // Save all mappings in parallel
      const results = await Promise.all(
        Object.entries(mappings).map(async ([systemField, webhookField]) => {
          if (!webhookField) {
            console.log('Skipping empty mapping:', systemField);
            return null;
          }

          const response = await fetch('/api/field-mappings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemField, webhookField })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to save mapping for ${systemField}: ${response.status}`);
          }
          return response.json();
        })
      );
      
      console.log('Save results:', results.filter(Boolean));
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Apply template
  const applyTemplate = (template: keyof typeof WEBHOOK_TEMPLATES) => {
    console.log('Applying template:', template);
    setMappings(WEBHOOK_TEMPLATES[template]);
    toast.success('Template applied - click Save to apply changes');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Webhook Field Mappings</h1>
        <div className="space-x-4">
          <Button 
            onClick={handleRefresh}
            variant="outline"
          >
            Refresh Fields
          </Button>
          <Button 
            onClick={() => applyTemplate('make')}
            variant="outline"
          >
            Apply Make.com Template
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-[#ff7a59] hover:bg-[#ff8f73] text-white"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
      
      <Card className="p-6">
        <div className="space-y-6">
          {SYSTEM_FIELDS.map(field => (
            <div key={field.id} className="flex items-center gap-4">
              <div className="w-1/3">
                <label className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              </div>
              <SearchableSelect
                options={webhookFields}
                value={mappings[field.id] || ''}
                onChange={(value) => handleFieldChange(field.id, value)}
                placeholder="Select webhook field..."
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
} 