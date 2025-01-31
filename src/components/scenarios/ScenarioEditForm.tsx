'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FilterSection } from '@/components/scenarios/FilterSection';
import { Filter } from '@/types/filters';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ScenarioEditFormProps {
  scenario: {
    id: string;
    name: string;
    touchpointType: string;
    isFollowUp: boolean;
    customizationPrompt?: string | null;
    emailExamplesPrompt?: string | null;
    subjectLine?: string | null;
    snippet?: { id: string; name: string } | null;
    attachment?: { id: string; name: string } | null;
    filters: Filter[];
  };
  fields: string[];
  snippets: Array<{ id: string; name: string }>;
  attachments: Array<{ id: string; name: string }>;
}

export function ScenarioEditForm({ scenario, fields, snippets, attachments }: ScenarioEditFormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/scenarios', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update scenario');
      }

      toast.success('Scenario updated successfully');
      window.location.href = '/settings/scenarios';
    } catch (error) {
      console.error('Error updating scenario:', error);
      toast.error('Failed to update scenario');
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
        <input type="hidden" name="id" value={scenario.id} />
        
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
                defaultValue={scenario.name}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="touchpointType">Type</Label>
              <Input
                id="touchpointType"
                name="touchpointType"
                defaultValue={scenario.touchpointType}
                disabled
                className="bg-gray-50"
              />
            </div>

            {scenario.touchpointType === 'email' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isFollowUp"
                  name="isFollowUp"
                  defaultChecked={scenario.isFollowUp}
                />
                <Label htmlFor="isFollowUp">Follow up on previous thread</Label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <input 
              type="hidden" 
              name="filters" 
              id="filters-json"
              value={JSON.stringify(scenario.filters)} 
            />
            <FilterSection
              initialFilters={scenario.filters}
              fields={fields}
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
                type="text"
                id="subjectLine"
                name="subjectLine"
                defaultValue={scenario.subjectLine ?? ''}
              />
            </div>

            <div>
              <Label htmlFor="customizationPrompt">Customization Prompt</Label>
              <Textarea
                id="customizationPrompt"
                name="customizationPrompt"
                defaultValue={scenario.customizationPrompt || ''}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="emailExamplesPrompt">Email Examples Prompt</Label>
              <Textarea
                id="emailExamplesPrompt"
                name="emailExamplesPrompt"
                defaultValue={scenario.emailExamplesPrompt || ''}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="snippetId">Snippet</Label>
              <input 
                type="hidden" 
                name="snippetId" 
                id="snippet-id-input"
                value={scenario.snippet?.id || ''} 
              />
              <SearchableSelect
                options={snippets.map(s => ({ value: s.id, label: s.name }))}
                value={scenario.snippet?.id}
                onChange={(value) => {
                  const input = document.getElementById('snippet-id-input') as HTMLInputElement;
                  if (input) input.value = value;
                }}
                placeholder="Select a snippet (optional)"
              />
            </div>

            {(scenario.touchpointType === 'email' || scenario.touchpointType === 'googleDrive') && (
              <div>
                <Label htmlFor="attachmentId">Attachment</Label>
                <input 
                  type="hidden" 
                  name="attachmentId" 
                  id="attachment-id-input"
                  value={scenario.attachment?.id || ''} 
                />
                <SearchableSelect
                  options={attachments.map(a => ({ value: a.id, label: a.name }))}
                  value={scenario.attachment?.id}
                  onChange={(value) => {
                    const input = document.getElementById('attachment-id-input') as HTMLInputElement;
                    if (input) input.value = value;
                  }}
                  placeholder="Select an attachment (optional)"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  );
} 