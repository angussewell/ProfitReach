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
    company: '{company}',
    propertyManagementSoftware: '{pms}'
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
  { id: 'company', label: 'Company Name', required: false },
  { id: 'propertyManagementSoftware', label: 'Property Management Software', required: false }
];

export default function SettingsPage() {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [webhookFields, setWebhookFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing mappings and webhook fields
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Fetching field mappings and webhook fields...');
        
        // Fetch mappings first
        const mappingsRes = await fetch('/api/field-mappings');
        if (!mappingsRes.ok) {
          throw new Error(`Failed to fetch mappings: ${mappingsRes.status}`);
        }
        const mappingsData = await mappingsRes.json();
        console.log('Received mappings:', mappingsData);
        
        // Convert array of mappings to object
        const mappingsObj = mappingsData.reduce((acc: Record<string, string>, m: any) => {
          acc[m.systemField] = m.webhookField;
          return acc;
        }, {});
        setMappings(mappingsObj);
        
        // Then fetch webhook fields
        const fieldsRes = await fetch('/api/webhook-fields');
        if (!fieldsRes.ok) {
          throw new Error(`Failed to fetch webhook fields: ${fieldsRes.status}`);
        }
        
        const fieldsData = await fieldsRes.json();
        console.log('Received webhook fields:', fieldsData);
        
        // Ensure we have an array of fields
        const fields = Array.isArray(fieldsData) ? fieldsData : [];
        setWebhookFields(fields);
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast.error('Failed to load settings. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Update local state
  const handleFieldChange = (systemField: string, webhookField: string) => {
    console.log('Updating field mapping:', { systemField, webhookField });
    setMappings(prev => ({ ...prev, [systemField]: webhookField }));
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

  if (loading) {
    return <div className="p-8">Loading settings...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Webhook Field Mappings</h1>
        <div className="space-x-4">
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