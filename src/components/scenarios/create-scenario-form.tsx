'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterBuilder } from '@/components/filters/FilterBuilder';
import { Filter } from '@/types/filters';
import { PromptInput } from '@/components/prompts/prompt-input';

interface CreateScenarioFormProps {
  onSubmit: (data: any) => void;
}

interface WebhookField {
  name: string;
  originalName: string;
  description?: string;
}

export function CreateScenarioForm({ onSubmit }: CreateScenarioFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    touchpointType: 'email',
    description: '',
    status: 'active',
    filters: JSON.stringify([]),
    customizationPrompt: '',
    emailExamplesPrompt: '',
    subjectLine: '',
  });

  const [filters, setFilters] = useState<Filter[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFields() {
      try {
        const response = await fetch("/api/webhook-fields");
        if (!response.ok) throw new Error("Failed to fetch webhook fields");
        const data: WebhookField[] = await response.json();
        // Extract just the field names for the FilterBuilder
        setFields(data.map(field => field.originalName));
      } catch (err) {
        console.error('Failed to load webhook fields:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchFields();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      filters: JSON.stringify(filters)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Enter scenario name"
            />
          </div>
          
          <div>
            <Label htmlFor="touchpointType">Type</Label>
            <Select 
              value={formData.touchpointType}
              onValueChange={(value) => setFormData({ ...formData, touchpointType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="googleDrive">Google Drive</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter scenario description"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <FilterBuilder
            initialFilters={filters}
            fields={fields}
            onChange={setFilters}
          />
        </CardContent>
      </Card>

      {/* Email Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="subjectLine">Subject Line</Label>
            <PromptInput
              value={formData.subjectLine}
              onChange={(value) => setFormData({ ...formData, subjectLine: value })}
              placeholder="Enter email subject line"
            />
          </div>

          <div>
            <Label htmlFor="customizationPrompt">Customization Prompt</Label>
            <PromptInput
              value={formData.customizationPrompt}
              onChange={(value) => setFormData({ ...formData, customizationPrompt: value })}
              placeholder="Enter customization prompt"
            />
          </div>

          <div>
            <Label htmlFor="emailExamplesPrompt">Email Examples Prompt</Label>
            <PromptInput
              value={formData.emailExamplesPrompt}
              onChange={(value) => setFormData({ ...formData, emailExamplesPrompt: value })}
              placeholder="Enter email examples prompt"
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full">Create Scenario</Button>
    </form>
  );
} 