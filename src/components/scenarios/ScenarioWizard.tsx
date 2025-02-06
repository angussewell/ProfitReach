'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FilterBuilder } from '@/components/filters/FilterBuilder';
import { Filter } from '@/types/filters';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PromptInput } from '@/components/prompts/prompt-input';
import { SearchableSelect } from '@/components/ui/searchable-select';

type TouchpointType = 'email' | 'googleDrive' | 'linkedin' | 'research';

interface ScenarioFormData {
  name: string;
  description?: string;
  touchpointType: TouchpointType;
  customizationPrompt?: string;
  emailExamplesPrompt?: string;
  subjectLine?: string;
  isFollowUp?: boolean;
  snippetId?: string;
  attachmentId?: string;
  attachmentName?: string;
  filters: Filter[];
}

interface WebhookField {
  name: string;
  originalName: string;
  description?: string;
}

export function ScenarioWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fields, setFields] = useState<string[]>([]);
  const [snippets, setSnippets] = useState<Array<{ id: string; name: string }>>([]);
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<ScenarioFormData>({
    name: '',
    touchpointType: 'email',
    filters: [],
    isFollowUp: false
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [fieldsRes, snippetsRes, attachmentsRes] = await Promise.all([
          fetch("/api/webhook-fields"),
          fetch("/api/snippets"),
          fetch("/api/attachments")
        ]);

        if (!fieldsRes.ok) throw new Error("Failed to fetch webhook fields");
        if (!snippetsRes.ok) throw new Error("Failed to fetch snippets");
        if (!attachmentsRes.ok) throw new Error("Failed to fetch attachments");

        const fieldsData: WebhookField[] = await fieldsRes.json();
        const snippetsData = await snippetsRes.json();
        const attachmentsData = await attachmentsRes.json();

        setFields(fieldsData.map(field => field.originalName));
        setSnippets(snippetsData);
        setAttachments(attachmentsData);
      } catch (err) {
        console.error('Failed to load data:', err);
        toast.error('Failed to load required data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const updateFormData = (updates: Partial<ScenarioFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called with formData:', formData);
    try {
      console.log('Sending POST request to /api/scenarios');
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          filters: JSON.stringify(formData.filters)
        }),
      });

      console.log('Response received:', response);
      if (!response.ok) {
        const error = await response.json();
        console.error('Error response:', error);
        throw new Error(error.message || 'Failed to create scenario');
      }

      toast.success('Scenario created successfully');
      router.push('/settings/scenarios');
    } catch (error) {
      console.error('Error creating scenario:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create scenario');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col space-y-1.5 p-6">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">Basic Information</h3>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div>
                <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Name</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  placeholder="Enter scenario name"
                  required
                  className="flex h-10 w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              
              <div>
                <label htmlFor="touchpointType" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Type</label>
                <select
                  id="touchpointType"
                  value={formData.touchpointType}
                  onChange={(e) => updateFormData({ touchpointType: e.target.value as TouchpointType })}
                  className="flex h-10 w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="email">Email</option>
                  <option value="googleDrive">Google Drive</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="research">Research</option>
                </select>
              </div>

              <div>
                <label htmlFor="description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Description</label>
                <textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  placeholder="Enter scenario description"
                  rows={4}
                  className="flex w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        if (formData.touchpointType === 'research') {
          return (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="text-2xl font-semibold leading-none tracking-tight">Research Configuration</h3>
              </div>
              <div className="p-6 pt-0 space-y-4">
                <div className="space-y-4">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Webhook Filters</label>
                  {fields.length > 0 ? (
                    <FilterBuilder
                      initialFilters={formData.filters}
                      fields={fields}
                      onChange={(filters) => updateFormData({ filters })}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">Loading webhook fields...</div>
                  )}
                </div>

                <div>
                  <label htmlFor="customizationPrompt" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Customization Prompt</label>
                  <PromptInput
                    value={formData.customizationPrompt || ''}
                    onChange={(value) => updateFormData({ customizationPrompt: value })}
                    placeholder="Enter customization prompt"
                    className="mt-1"
                    rows={4}
                  />
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col space-y-1.5 p-6">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">Email Configuration</h3>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div className="space-y-4">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Webhook Filters</label>
                {fields.length > 0 ? (
                  <FilterBuilder
                    initialFilters={formData.filters}
                    fields={fields}
                    onChange={(filters) => updateFormData({ filters })}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">Loading webhook fields...</div>
                )}
              </div>

              <div>
                <label htmlFor="subjectLine" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Subject Line</label>
                <PromptInput
                  value={formData.subjectLine || ''}
                  onChange={(value) => updateFormData({ subjectLine: value })}
                  placeholder="Enter subject line"
                  className="mt-1"
                  rows={1}
                  isSubjectLine={true}
                />
              </div>

              <div>
                <label htmlFor="customizationPrompt" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Customization Prompt</label>
                <PromptInput
                  value={formData.customizationPrompt || ''}
                  onChange={(value) => updateFormData({ customizationPrompt: value })}
                  placeholder="Enter customization prompt"
                  className="mt-1"
                  rows={4}
                />
              </div>

              <div>
                <label htmlFor="emailExamplesPrompt" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email Examples</label>
                <PromptInput
                  value={formData.emailExamplesPrompt || ''}
                  onChange={(value) => updateFormData({ emailExamplesPrompt: value })}
                  placeholder="Enter email examples"
                  className="mt-1"
                  rows={4}
                />
              </div>

              {formData.touchpointType === 'email' && (
                <>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isFollowUp"
                      checked={formData.isFollowUp}
                      onChange={(e) => updateFormData({ isFollowUp: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="isFollowUp" className="text-sm font-medium leading-none">Follow up on previous thread</label>
                  </div>

                  <div className="mt-1">
                    <label htmlFor="snippetId" className="text-sm font-medium leading-none">Snippet</label>
                    <div className="mt-1">
                      <SearchableSelect
                        options={snippets.map(s => ({ value: s.id, label: s.name }))}
                        value={formData.snippetId}
                        onChange={(value) => updateFormData({ snippetId: value })}
                        placeholder="Select a snippet (optional)"
                      />
                    </div>
                  </div>
                </>
              )}

              {(formData.touchpointType === 'email' || formData.touchpointType === 'googleDrive') && (
                <div className="mt-1">
                  <label htmlFor="attachmentId" className="text-sm font-medium leading-none">Attachment</label>
                  <div className="mt-1">
                    <SearchableSelect
                      options={attachments.map(a => ({ value: a.id, label: a.name }))}
                      value={formData.attachmentId}
                      onChange={(value) => updateFormData({ attachmentId: value })}
                      placeholder="Select an attachment (optional)"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    const result = step === 1 
      ? Boolean(formData.name && formData.touchpointType)
      : formData.touchpointType === 'research'
        ? Boolean(formData.customizationPrompt)
        : Boolean(formData.customizationPrompt && formData.emailExamplesPrompt);
    
    console.log('canProceed result:', result, { step, formData });
    return result;
  };

  return (
    <div className="space-y-6">
      {renderStep()}

      <div className="flex justify-between">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            Previous
          </button>
        )}

        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="ml-auto inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              console.log('Create Scenario button clicked');
              handleSubmit();
            }}
            disabled={!canProceed()}
            className="ml-auto inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Create Scenario
          </button>
        )}
      </div>
    </div>
  );
} 