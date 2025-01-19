'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// Pre-configured templates
const WEBHOOK_TEMPLATES = {
  make: {
    contactEmail: '{email}',
    contactFirstName: '{first_name}',
    contactLastName: '{last_name}',
    scenarioName: 'make_sequence',
    leadStatus: 'lead_status',
    lifecycleStage: 'lifecycle_stage',
    userWebsite: 'website'
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

export default function SettingsPage() {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [webhookFields, setWebhookFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing mappings and sample webhook fields
  useEffect(() => {
    const loadData = async () => {
      try {
        const [mappingsRes, fieldsRes] = await Promise.all([
          fetch('/api/field-mappings'),
          fetch('/api/webhook-fields/sample')
        ]);
        
        if (mappingsRes.ok && fieldsRes.ok) {
          const [mappingsData, fieldsData] = await Promise.all([
            mappingsRes.json(),
            fieldsRes.json()
          ]);
          
          // Convert array of mappings to object for easier state management
          const mappingsObj = mappingsData.reduce((acc: Record<string, string>, m: any) => {
            acc[m.systemField] = m.webhookField;
            return acc;
          }, {});
          
          setMappings(mappingsObj);
          setWebhookFields(fieldsData.fields);
        }
      } catch (error) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Update local state
  const handleFieldChange = (systemField: string, webhookField: string) => {
    setMappings(prev => ({ ...prev, [systemField]: webhookField }));
  };

  // Save all changes
  const handleSave = async () => {
    setSaving(true);
    try {
      // Save all mappings in parallel
      await Promise.all(
        Object.entries(mappings).map(([systemField, webhookField]) =>
          fetch('/api/field-mappings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemField, webhookField })
          })
        )
      );
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Apply template
  const applyTemplate = (template: keyof typeof WEBHOOK_TEMPLATES) => {
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
              <Select
                value={mappings[field.id] || ''}
                onValueChange={value => handleFieldChange(field.id, value)}
              >
                <SelectTrigger className="w-2/3">
                  <SelectValue placeholder="Select webhook field" />
                </SelectTrigger>
                <SelectContent>
                  {webhookFields.map(field => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
} 