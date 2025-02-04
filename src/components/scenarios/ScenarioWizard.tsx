'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FilterBuilder } from '@/components/filters/FilterBuilder';
import { Filter } from '@/types/filters';

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
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<ScenarioFormData>({
    name: '',
    touchpointType: 'email',
    filters: []
  });

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
        toast.error('Failed to load webhook fields');
      } finally {
        setIsLoading(false);
      }
    }
    fetchFields();
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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="Enter scenario name"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="touchpointType" className="block text-sm font-medium text-gray-700">Touchpoint Type</label>
              <select
                id="touchpointType"
                value={formData.touchpointType}
                onChange={(e) => updateFormData({ touchpointType: e.target.value as TouchpointType })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="email">Email</option>
                <option value="googleDrive">Google Drive</option>
                <option value="linkedin">LinkedIn</option>
                <option value="research">Research</option>
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder="Enter scenario description"
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        );

      case 2:
        if (formData.touchpointType === 'research') {
          return (
            <div className="space-y-4">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Webhook Filters</label>
                {fields.length > 0 ? (
                  <FilterBuilder
                    initialFilters={formData.filters}
                    fields={fields}
                    onChange={(filters) => updateFormData({ filters })}
                  />
                ) : (
                  <div className="text-sm text-gray-500">Loading webhook fields...</div>
                )}
              </div>

              <div>
                <label htmlFor="customizationPrompt" className="block text-sm font-medium text-gray-700">Customization Prompt</label>
                <textarea
                  id="customizationPrompt"
                  value={formData.customizationPrompt || ''}
                  onChange={(e) => updateFormData({ customizationPrompt: e.target.value })}
                  placeholder="Enter customization prompt"
                  rows={4}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Webhook Filters</label>
              {fields.length > 0 ? (
                <FilterBuilder
                  initialFilters={formData.filters}
                  fields={fields}
                  onChange={(filters) => updateFormData({ filters })}
                />
              ) : (
                <div className="text-sm text-gray-500">Loading webhook fields...</div>
              )}
            </div>

            <div>
              <label htmlFor="customizationPrompt" className="block text-sm font-medium text-gray-700">Customization Prompt</label>
              <textarea
                id="customizationPrompt"
                value={formData.customizationPrompt || ''}
                onChange={(e) => updateFormData({ customizationPrompt: e.target.value })}
                placeholder="Enter customization prompt"
                rows={4}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="emailExamplesPrompt" className="block text-sm font-medium text-gray-700">Email Examples</label>
              <textarea
                id="emailExamplesPrompt"
                value={formData.emailExamplesPrompt || ''}
                onChange={(e) => updateFormData({ emailExamplesPrompt: e.target.value })}
                placeholder="Enter email examples"
                rows={4}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            {formData.touchpointType === 'email' && (
              <>
                <div>
                  <label htmlFor="subjectLine" className="block text-sm font-medium text-gray-700">Subject Line</label>
                  <input
                    id="subjectLine"
                    type="text"
                    value={formData.subjectLine || ''}
                    onChange={(e) => updateFormData({ subjectLine: e.target.value })}
                    placeholder="Enter subject line"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isFollowUp"
                    checked={formData.isFollowUp || false}
                    onChange={(e) => updateFormData({ isFollowUp: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isFollowUp" className="text-sm font-medium text-gray-700">Follow up on previous thread</label>
                </div>

                <div>
                  <label htmlFor="snippetId" className="block text-sm font-medium text-gray-700">Snippet</label>
                  <select
                    id="snippetId"
                    value={formData.snippetId}
                    onChange={(e) => updateFormData({ snippetId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a snippet (optional)</option>
                    {/* Add snippet options here */}
                  </select>
                </div>
              </>
            )}

            {(formData.touchpointType === 'email' || formData.touchpointType === 'googleDrive') && (
              <>
                <div>
                  <label htmlFor="attachmentId" className="block text-sm font-medium text-gray-700">Attachment</label>
                  <select
                    id="attachmentId"
                    value={formData.attachmentId}
                    onChange={(e) => updateFormData({ attachmentId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select an attachment (optional)</option>
                    {/* Add attachment options here */}
                  </select>
                </div>

                {formData.attachmentId && (
                  <div>
                    <label htmlFor="attachmentName" className="block text-sm font-medium text-gray-700">Attachment Name</label>
                    <input
                      id="attachmentName"
                      type="text"
                      value={formData.attachmentName || ''}
                      onChange={(e) => updateFormData({ attachmentName: e.target.value })}
                      placeholder="Enter attachment name"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    if (step === 1) {
      return formData.name && formData.touchpointType;
    }
    
    if (step === 2) {
      if (formData.touchpointType === 'research') {
        return formData.customizationPrompt;
      }
      return formData.customizationPrompt && formData.emailExamplesPrompt;
    }

    return false;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {step === 1 ? 'Basic Information' : 'Configuration'}
          </h2>
          {renderStep()}
        </div>
      </div>

      <div className="flex justify-between">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Previous
          </button>
        )}

        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Scenario
          </button>
        )}
      </div>
    </div>
  );
} 