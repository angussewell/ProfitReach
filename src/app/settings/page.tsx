'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

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
        toast.success('Mapping updated');
      }
    } catch (error) {
      toast.error('Failed to update mapping');
    }
  };

  if (loading) {
    return <div className="p-8">Loading settings...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Webhook Field Mappings</h1>
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