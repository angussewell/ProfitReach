'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterBuilder } from '@/components/filters/FilterBuilder';
import { Filter } from '@/types/filters';

export default function NewScenarioPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [fields, setFields] = useState([]);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch('/api/webhook-fields');
        const data = await response.json();
        setFields(data);
      } catch (error) {
        console.error('Error fetching webhook fields:', error);
        toast({
          title: 'Error',
          description: 'Failed to load webhook fields',
          variant: 'destructive',
        });
      }
    };

    fetchFields();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      touchpointType: formData.get('touchpointType') || 'email',
      description: formData.get('description'),
      status: 'active',
      filters: JSON.stringify(filters),
      customizationPrompt: formData.get('customizationPrompt'),
      emailExamplesPrompt: formData.get('emailExamplesPrompt'),
      subjectLine: formData.get('subjectLine'),
    };

    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create scenario');
      }

      const result = await response.json();
      toast({
        title: 'Success',
        description: 'Scenario created successfully',
      });
      router.push(`/settings/scenarios/${result.id}`);
    } catch (error) {
      console.error('Error creating scenario:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create scenario',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Create New Scenario</h1>

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
                name="name"
                required
                placeholder="Enter scenario name"
              />
            </div>
            
            <div>
              <Label htmlFor="touchpointType">Type</Label>
              <Select name="touchpointType" defaultValue="email">
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
                name="description"
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
              <Input
                id="subjectLine"
                name="subjectLine"
                placeholder="Enter email subject line"
              />
            </div>

            <div>
              <Label htmlFor="customizationPrompt">Customization Prompt</Label>
              <Textarea
                id="customizationPrompt"
                name="customizationPrompt"
                placeholder="Enter customization prompt"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="emailExamplesPrompt">Email Examples Prompt</Label>
              <Textarea
                id="emailExamplesPrompt"
                name="emailExamplesPrompt"
                placeholder="Enter email examples prompt"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Scenario'}
          </Button>
        </div>
      </form>
    </div>
  );
} 