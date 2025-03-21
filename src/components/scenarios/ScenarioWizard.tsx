'use client';

import { useState, useEffect, HTMLAttributes } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FilterBuilder } from '@/components/filters/FilterBuilder';
import { Filter } from '@/types/filters';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PromptInput } from '@/components/prompts/prompt-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ScenarioTypeSelector, TouchpointType } from './scenario-type-selector';
import type { ComponentProps } from 'react';

// Create client-side components
const ClientCard = Card as React.ComponentType<HTMLAttributes<HTMLDivElement>>;
const ClientCardHeader = CardHeader as React.ComponentType<HTMLAttributes<HTMLDivElement>>;
const ClientCardTitle = CardTitle as React.ComponentType<HTMLAttributes<HTMLHeadingElement>>;
const ClientCardContent = CardContent as React.ComponentType<HTMLAttributes<HTMLDivElement>>;
const ClientLabel = Label as React.ComponentType<React.LabelHTMLAttributes<HTMLLabelElement>>;
const ClientInput = Input as React.ComponentType<React.InputHTMLAttributes<HTMLInputElement>>;
const ClientButton = Button as React.ComponentType<ComponentProps<typeof Button>>;

interface ScenarioFormData {
  name: string;
  touchpointType: TouchpointType;
  customizationPrompt: string;
  emailExamplesPrompt: string;
  subjectLine: string;
  isFollowUp: boolean;
  snippetId: string;
  attachmentId: string;
  attachmentName?: string;
  filters: Filter[];
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
    customizationPrompt: '',
    emailExamplesPrompt: '',
    subjectLine: '',
    isFollowUp: false,
    snippetId: '',
    attachmentId: '',
    filters: []
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [fieldsResponse, snippetsResponse, attachmentsResponse] = await Promise.all([
          fetch("/api/webhook-fields"),
          fetch("/api/snippets"),
          fetch("/api/attachments")
        ]);

        if (!fieldsResponse.ok) throw new Error("Failed to fetch webhook fields");
        if (!snippetsResponse.ok) throw new Error("Failed to fetch snippets");
        if (!attachmentsResponse.ok) throw new Error("Failed to fetch attachments");

        const fieldsData = await fieldsResponse.json();
        const snippetsData = await snippetsResponse.json();
        const attachmentsData = await attachmentsResponse.json();

        setFields(fieldsData.map((field: any) => field.originalName));
        setSnippets(snippetsData);
        setAttachments(attachmentsData);
      } catch (err) {
        console.error('Failed to load data:', err);
        toast.error('Failed to load necessary data');
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
    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          filters: JSON.stringify(formData.filters)
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create scenario');
      }

      toast.success('Scenario created successfully');
      router.push('/settings/scenarios');
    } catch (error) {
      console.error('Error creating scenario:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create scenario');
    }
  };

  const canProceed = () => {
    if (step === 1) {
      return formData.name.trim() !== '' && formData.touchpointType;
    }
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <ClientCard>
              <ClientCardHeader>
                <ClientCardTitle>Create New Scenario</ClientCardTitle>
              </ClientCardHeader>
              <ClientCardContent className="space-y-6">
                <div>
                  <ClientLabel htmlFor="name">Name</ClientLabel>
                  <ClientInput
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                    placeholder="Enter scenario name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <ClientLabel>Type</ClientLabel>
                  <ScenarioTypeSelector
                    selectedType={formData.touchpointType}
                    onTypeSelect={(type) => updateFormData({ touchpointType: type })}
                    className="mt-2"
                  />
                </div>
              </ClientCardContent>
            </ClientCard>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <ClientCard>
              <ClientCardHeader>
                <ClientCardTitle>Configure Filters</ClientCardTitle>
              </ClientCardHeader>
              <ClientCardContent>
                <FilterBuilder
                  initialFilters={formData.filters}
                  fields={fields}
                  onChange={(filters) => updateFormData({ filters })}
                />
              </ClientCardContent>
            </ClientCard>

            {formData.touchpointType === 'email' && (
              <ClientCard>
                <ClientCardHeader>
                  <ClientCardTitle>Email Configuration</ClientCardTitle>
                </ClientCardHeader>
                <ClientCardContent className="space-y-4">
                  <div>
                    <ClientLabel htmlFor="subjectLine">Subject Line</ClientLabel>
                    <PromptInput
                      value={formData.subjectLine}
                      onChange={(value) => updateFormData({ subjectLine: value || '' })}
                      placeholder="Enter email subject line"
                      className="mt-1"
                      rows={1}
                      isSubjectLine={true}
                    />
                  </div>

                  <div>
                    <ClientLabel htmlFor="customizationPrompt">Customization Prompt</ClientLabel>
                    <PromptInput
                      value={formData.customizationPrompt}
                      onChange={(value) => updateFormData({ customizationPrompt: value || '' })}
                      placeholder="Enter customization prompt"
                      className="mt-1"
                      rows={4}
                    />
                  </div>

                  <div>
                    <ClientLabel htmlFor="emailExamplesPrompt">Email Examples Prompt</ClientLabel>
                    <PromptInput
                      value={formData.emailExamplesPrompt}
                      onChange={(value) => updateFormData({ emailExamplesPrompt: value || '' })}
                      placeholder="Enter email examples prompt"
                      className="mt-1"
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isFollowUp"
                      checked={formData.isFollowUp}
                      onChange={(e) => updateFormData({ isFollowUp: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <ClientLabel htmlFor="isFollowUp">Follow up on previous thread</ClientLabel>
                  </div>

                  <div>
                    <ClientLabel htmlFor="snippetId">Snippet</ClientLabel>
                    <SearchableSelect
                      options={[{ value: '', label: 'No snippet' }, ...snippets.map(s => ({ value: s.id, label: s.name }))] }
                      value={formData.snippetId}
                      onChange={(value) => updateFormData({ snippetId: value || '' })}
                      placeholder="Select a snippet (optional)"
                    />
                  </div>
                </ClientCardContent>
              </ClientCard>
            )}

            {(formData.touchpointType === 'email' || formData.touchpointType === 'googleDrive') && (
              <ClientCard>
                <ClientCardHeader>
                  <ClientCardTitle>Attachment</ClientCardTitle>
                </ClientCardHeader>
                <ClientCardContent>
                  <div>
                    <ClientLabel htmlFor="attachmentId">Select Attachment</ClientLabel>
                    <SearchableSelect
                      options={[{ value: '', label: 'No attachment' }, ...attachments.map(a => ({ value: a.id, label: a.name }))] }
                      value={formData.attachmentId}
                      onChange={(value) => updateFormData({ attachmentId: value || '' })}
                      placeholder="Select an attachment (optional)"
                    />
                  </div>
                </ClientCardContent>
              </ClientCard>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      {renderStep()}

      <div className="flex justify-between">
        {step > 1 && (
          <ClientButton
            type="button"
            variant="outline"
            onClick={() => setStep(step - 1)}
          >
            Back
          </ClientButton>
        )}

        {step < 2 ? (
          <ClientButton
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="ml-auto"
          >
            Next
          </ClientButton>
        ) : (
          <ClientButton
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed()}
            className="ml-auto"
          >
            Create Scenario
          </ClientButton>
        )}
      </div>
    </div>
  );
}