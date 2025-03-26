'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterSection } from '@/components/scenarios/FilterSection';
import { Filter } from '@/types/filters';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PromptInput } from '@/components/prompts/prompt-input';
import { useRouter } from 'next/navigation';

interface ScenarioEditFormProps {
  scenario: {
    id: string;
    name: string;
    touchpointType: string;
    isFollowUp: boolean;
    testMode: boolean;
    testEmail: string | null;
    customizationPrompt?: string | null;
    emailExamplesPrompt?: string | null;
    subjectLine?: string | null;
    snippet?: { id: string; name: string } | null;
    attachment?: { id: string; name: string } | null;
    filters: Filter[];
    isHighPerforming?: boolean;
  };
  fields: string[];
  snippets: Array<{ id: string; name: string }>;
  attachments: Array<{ id: string; name: string }>;
}

export function ScenarioEditForm({ scenario, fields, snippets, attachments }: ScenarioEditFormProps) {
  const router = useRouter();
  const [formData, setFormData] = React.useState({
    id: scenario.id,
    name: scenario.name,
    touchpointType: scenario.touchpointType,
    isFollowUp: scenario.isFollowUp,
    testMode: scenario.testMode ?? false,
    testEmail: scenario.testEmail || '',
    customizationPrompt: scenario.customizationPrompt || '',
    emailExamplesPrompt: scenario.emailExamplesPrompt || '',
    subjectLine: scenario.subjectLine || '',
    snippetId: scenario.snippet?.id || '',
    attachmentId: scenario.attachment?.id || '',
    filters: typeof scenario.filters === 'string' ? JSON.parse(scenario.filters) : scenario.filters,
    isHighPerforming: scenario.isHighPerforming ?? false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const requestData = {
        ...formData,
        filters: formData.filters
      };

      console.log('Sending PUT request to /api/scenarios with data:', requestData);
      
      const response = await fetch('/api/scenarios', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      // Get response data first
      const responseData = await response.json();
      
      // Then check status and handle accordingly
      if (response.ok) {
        console.log('Scenario updated successfully:', responseData);
        
        // Update local state with the response data
        setFormData(prev => ({
          ...prev,
          ...responseData,
          isHighPerforming: responseData.isHighPerforming
        }));
        
        toast.success('Scenario updated successfully');
        
        // Wait for state update and toast
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Refresh the router first
        await router.refresh();
        
        // Then navigate
        setTimeout(() => {
          router.push('/settings/scenarios');
        }, 500);
      } else {
        console.error('Error response:', responseData);
        throw new Error(responseData.details || responseData.message || responseData.error || 'Failed to update scenario');
      }
    } catch (error) {
      console.error('Error updating scenario:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update scenario');
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/scenarios/${scenario.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete scenario');
      }

      toast.success('Scenario deleted successfully');
      window.location.href = '/settings/scenarios';
    } catch (error) {
      console.error('Error deleting scenario:', error);
      toast.error('Failed to delete scenario');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Edit Scenario: {scenario.name}</h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Scenario
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the scenario
                and remove it from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

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
              />
            </div>
            
            <div>
              <Label htmlFor="touchpointType">Type</Label>
              <Input
                id="touchpointType"
                value={formData.touchpointType}
                disabled
                className="bg-gray-50"
              />
            </div>

            {formData.touchpointType === 'email' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isFollowUp"
                  checked={formData.isFollowUp}
                  onCheckedChange={(checked) => setFormData({ ...formData, isFollowUp: checked as boolean })}
                />
                <Label htmlFor="isFollowUp">Follow up on previous thread</Label>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="testMode"
                  checked={formData.testMode}
                  onCheckedChange={(checked) => setFormData({ ...formData, testMode: checked ? true : false })}
                />
                <Label htmlFor="testMode">Enable Test Mode</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isHighPerforming"
                  checked={formData.isHighPerforming}
                  onCheckedChange={(checked) => setFormData({ ...formData, isHighPerforming: checked ? true : false })}
                />
                <Label htmlFor="isHighPerforming">Add to High-Performing Training Pool</Label>
              </div>

              <div>
                <Label htmlFor="testEmail">Test Email Address</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={formData.testEmail}
                  onChange={(e) => setFormData({ ...formData, testEmail: e.target.value })}
                  placeholder="Enter test email address"
                  className={formData.testMode ? '' : 'opacity-50'}
                  disabled={!formData.testMode}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <FilterSection
              initialFilters={formData.filters}
              fields={fields}
              onChange={(filters) => setFormData({ ...formData, filters })}
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
                placeholder="Enter subject line"
                className="mt-1"
                rows={1}
                isSubjectLine={true}
              />
            </div>

            <div>
              <Label htmlFor="customizationPrompt">Customization Prompt</Label>
              <PromptInput
                value={formData.customizationPrompt}
                onChange={(value) => setFormData({ ...formData, customizationPrompt: value })}
                placeholder="Enter customization prompt"
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="emailExamplesPrompt">Email Examples Prompt</Label>
              <PromptInput
                value={formData.emailExamplesPrompt}
                onChange={(value) => setFormData({ ...formData, emailExamplesPrompt: value })}
                placeholder="Enter email examples"
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="snippetId">Snippet</Label>
              <SearchableSelect
                options={[{ value: '', label: 'No snippet' }, ...snippets.map(s => ({ value: s.id, label: s.name }))] }
                value={formData.snippetId}
                onChange={(value) => setFormData({ ...formData, snippetId: value })}
                placeholder="Select a snippet (optional)"
              />
            </div>

            {(formData.touchpointType === 'email' || formData.touchpointType === 'googleDrive') && (
              <div>
                <Label htmlFor="attachmentId">Attachment</Label>
                <SearchableSelect
                  options={[{ value: '', label: 'No attachment' }, ...attachments.map(a => ({ value: a.id, label: a.name }))] }
                  value={formData.attachmentId}
                  onChange={(value) => setFormData({ ...formData, attachmentId: value })}
                  placeholder="Select an attachment (optional)"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            type="submit"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
} 