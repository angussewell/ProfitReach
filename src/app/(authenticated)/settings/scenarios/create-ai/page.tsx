'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageContainer } from '@/components/layout/PageContainer';
import { Loader2 } from 'lucide-react';

export default function CreateAIScenarioPage(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    touchpointType: 'email',
    prompt: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First create the scenario in our database
      const dbResponse = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          touchpointType: formData.touchpointType,
          status: 'pending',
          filters: '[]',
          customizationPrompt: 'pending',
          emailExamplesPrompt: 'pending',
          subjectLine: 'pending',
        }),
      });

      if (!dbResponse.ok) {
        throw new Error('Failed to create scenario in database');
      }

      const scenario = await dbResponse.json();

      // Then send to the n8n webhook
      const webhookResponse = await fetch('https://n8n-n8n.swl3bc.easypanel.host/webhook/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.touchpointType,
          prompt: formData.prompt,
          organizationId: scenario.organizationId,
          scenarioId: scenario.id,
        }),
      });

      if (!webhookResponse.ok) {
        throw new Error('Failed to generate AI scenario');
      }

      toast.success('AI Scenario creation started');
      router.push('/settings/scenarios');
    } catch (error) {
      console.error('Error creating AI scenario:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create AI scenario');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto py-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create AI Scenario</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Scenario Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter scenario name"
                  required
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="type">Scenario Type</Label>
                <Select
                  value={formData.touchpointType}
                  onValueChange={(value) => setFormData({ ...formData, touchpointType: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger className="mt-1">
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
                <Label htmlFor="prompt">AI Prompt</Label>
                <Textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  placeholder="Describe your scenario in detail. The AI will generate appropriate prompts and settings."
                  required
                  className="mt-1"
                  rows={6}
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create AI Scenario'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
