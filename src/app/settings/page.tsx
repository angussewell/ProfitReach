'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// Pre-configured templates for common webhook formats
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
];

interface FieldMapping {
  id: string;
  systemField: string;
  webhookField: string;
  description?: string;
  isRequired: boolean;
}

export default function SettingsPage() {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [webhookFields, setWebhookFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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
          
          setMappings(mappingsData);
          // Add template fields to available fields
          setWebhookFields([
            ...new Set([
              ...fieldsData.fields,
              '{email}',
              '{first_name}',
              '{last_name}',
              'make_sequence',
              'lead_status',
              'lifecycle_stage',
              'website'
            ])
          ]);
        }
      } catch (error) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Apply a template
  const applyTemplate = async (template: keyof typeof WEBHOOK_TEMPLATES) => {
    try {
      const templateData = WEBHOOK_TEMPLATES[template];
      
      // Update all mappings in parallel
      await Promise.all(
        Object.entries(templateData).map(([systemField, webhookField]) =>
          updateMapping(systemField, webhookField)
        )
      );

      toast.success('Template applied successfully');
    } catch (error) {
      toast.error('Failed to apply template');
    }
  };

  // Update a field mapping
  const updateMapping = async (systemField: string, webhookField: string) => {
    try {
      const res = await fetch('/api/field-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemField, webhookField })
      });

      if (res.ok) {
        const updatedMapping = await res.json();
        setMappings(prev => 
          prev.map(m => m.systemField === systemField ? updatedMapping : m)
        );
      }
    } catch (error) {
      throw error;
    }
  };

  if (loading) {
    return <div className="p-8">Loading settings...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Webhook Field Mappings</h1>
        <Button 
          onClick={() => applyTemplate('make')}
          className="bg-[#ff7a59] hover:bg-[#ff8f73] text-white"
        >
          Apply Make.com Template
        </Button>
      </div>
      <Card className="p-6">
        <div className="space-y-6">
          {SYSTEM_FIELDS.map(field => {
            const mapping = mappings.find(m => m.systemField === field.id);
            
            return (
              <div key={field.id} className="flex items-center gap-4">
                <div className="w-1/3">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                </div>
                <Select
                  value={mapping?.webhookField || ''}
                  onValueChange={value => updateMapping(field.id, value)}
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
            );
          })}
        </div>
      </Card>
    </div>
  );
} 