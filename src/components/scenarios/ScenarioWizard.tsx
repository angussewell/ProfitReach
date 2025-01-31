'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export function ScenarioWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ScenarioFormData>({
    name: '',
    touchpointType: 'email',
    filters: [],
  });
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<string[]>([]);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch('/api/webhook-fields');
        const data = await response.json();
        setFields(data);
      } catch (error) {
        console.error('Error fetching webhook fields:', error);
        toast.error('Failed to load webhook fields');
      }
    };

    fetchFields();
  }, []);

  const updateFormData = (updates: Partial<ScenarioFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
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
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  placeholder="Enter scenario name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="touchpointType">Touchpoint Type</Label>
                <Select
                  value={formData.touchpointType}
                  onValueChange={(value: TouchpointType) => updateFormData({ touchpointType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="googleDrive">Google Drive</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  placeholder="Enter scenario description"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        if (formData.touchpointType === 'research') {
          return (
            <Card>
              <CardHeader>
                <CardTitle>Research Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <Label>Webhook Filters</Label>
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
                  <Label htmlFor="customizationPrompt">Customization Prompt</Label>
                  <Textarea
                    id="customizationPrompt"
                    value={formData.customizationPrompt || ''}
                    onChange={(e) => updateFormData({ customizationPrompt: e.target.value })}
                    placeholder="Enter customization prompt"
                    rows={4}
                    required
                  />
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card>
            <CardHeader>
              <CardTitle>Communication Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Label>Webhook Filters</Label>
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
                <Label htmlFor="customizationPrompt">Customization Prompt</Label>
                <Textarea
                  id="customizationPrompt"
                  value={formData.customizationPrompt || ''}
                  onChange={(e) => updateFormData({ customizationPrompt: e.target.value })}
                  placeholder="Enter customization prompt"
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="emailExamplesPrompt">Email Examples</Label>
                <Textarea
                  id="emailExamplesPrompt"
                  value={formData.emailExamplesPrompt || ''}
                  onChange={(e) => updateFormData({ emailExamplesPrompt: e.target.value })}
                  placeholder="Enter email examples"
                  rows={4}
                  required
                />
              </div>

              {formData.touchpointType === 'email' && (
                <>
                  <div>
                    <Label htmlFor="subjectLine">Subject Line</Label>
                    <Input
                      id="subjectLine"
                      value={formData.subjectLine || ''}
                      onChange={(e) => updateFormData({ subjectLine: e.target.value })}
                      placeholder="Enter subject line"
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isFollowUp"
                      checked={formData.isFollowUp || false}
                      onChange={(e) => updateFormData({ isFollowUp: e.target.checked })}
                    />
                    <Label htmlFor="isFollowUp">Follow up on previous thread</Label>
                  </div>

                  <div>
                    <Label htmlFor="snippetId">Snippet</Label>
                    <Select
                      value={formData.snippetId}
                      onValueChange={(value) => updateFormData({ snippetId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a snippet (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Add snippet options here */}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {(formData.touchpointType === 'email' || formData.touchpointType === 'googleDrive') && (
                <>
                  <div>
                    <Label htmlFor="attachmentId">Attachment</Label>
                    <Select
                      value={formData.attachmentId}
                      onValueChange={(value) => updateFormData({ attachmentId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an attachment (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Add attachment options here */}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.attachmentId && (
                    <div>
                      <Label htmlFor="attachmentName">Attachment Name</Label>
                      <Input
                        id="attachmentName"
                        value={formData.attachmentName || ''}
                        onChange={(e) => updateFormData({ attachmentName: e.target.value })}
                        placeholder="Enter attachment name"
                        required
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
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
      {renderStep()}

      <div className="flex justify-between">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={loading}
          >
            Previous
          </Button>
        )}

        {step < 2 ? (
          <Button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed() || loading}
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed() || loading}
          >
            {loading ? 'Creating...' : 'Create Scenario'}
          </Button>
        )}
      </div>
    </div>
  );
} 