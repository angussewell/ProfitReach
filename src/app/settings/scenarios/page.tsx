'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Edit, Loader2 } from 'lucide-react';

interface Signature {
  id: string;
  signatureName: string;
  signatureContent: string;
}

interface Scenario {
  id: string;
  name: string;
  scenarioType: string;
  subjectLine: string;
  signatureId: string;
  customizationPrompt: string;
  emailExamplesPrompt: string;
  signature?: Signature;
}

export default function ManageScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchScenarios();
    fetchSignatures();
  }, []);

  const fetchScenarios = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/scenarios');
      if (!response.ok) throw new Error('Failed to fetch scenarios');
      const data = await response.json();
      setScenarios(data);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      toast({
        title: 'Error',
        description: 'Failed to load scenarios',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSignatures = async () => {
    try {
      const response = await fetch('/api/signatures');
      if (!response.ok) throw new Error('Failed to fetch signatures');
      const data = await response.json();
      setSignatures(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load signatures',
        variant: 'destructive',
      });
    }
  };

  const handleCreateScenario = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingScenario) return;

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingScenario),
      });

      if (!response.ok) throw new Error('Failed to create scenario');
      
      toast({
        title: 'Success',
        description: 'Scenario created successfully',
      });
      
      setEditingScenario(null);
      setIsCreating(false);
      fetchScenarios();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create scenario',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditScenario = async (scenario: Scenario) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/scenarios/${encodeURIComponent(scenario.name)}`);
      if (!response.ok) throw new Error('Failed to fetch scenario details');
      const scenarioDetails = await response.json();
      
      setSelectedScenario(scenario.name);
      setEditingScenario(scenarioDetails);
    } catch (error) {
      console.error('Error fetching scenario details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load scenario details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateScenario = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingScenario || !selectedScenario) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/scenarios/${encodeURIComponent(selectedScenario)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingScenario),
      });

      if (!response.ok) throw new Error('Failed to update scenario');
      
      toast({
        title: 'Success',
        description: 'Scenario updated successfully',
      });
      
      setEditingScenario(null);
      setSelectedScenario(null);
      fetchScenarios();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update scenario',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Scenarios</h1>
        <Button onClick={() => {
          setIsCreating(true);
          setSelectedScenario(null);
          setEditingScenario({
            id: '',
            name: '',
            scenarioType: 'simple',
            subjectLine: '',
            signatureId: '',
            customizationPrompt: '',
            emailExamplesPrompt: '',
          });
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Scenario
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : !isCreating && !selectedScenario ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario) => (
            <Card key={scenario.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleEditScenario(scenario)}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{scenario.name}</span>
                  <Edit className="h-4 w-4 text-gray-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Type: {scenario.scenarioType}</p>
                <p className="text-sm text-gray-500 truncate">Subject: {scenario.subjectLine}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <form onSubmit={isCreating ? handleCreateScenario : handleUpdateScenario} className="space-y-4 max-w-2xl">
          <Input
            placeholder="Scenario Name"
            value={editingScenario?.name || ''}
            onChange={(e) => setEditingScenario(prev => prev ? { ...prev, name: e.target.value } : null)}
            required
            disabled={!isCreating}
          />

          <Select
            value={editingScenario?.scenarioType || ''}
            onChange={(e) => setEditingScenario(prev => prev ? { ...prev, scenarioType: e.target.value } : null)}
            required
          >
            <option value="simple">Simple Email</option>
            <option value="one_attachment">One Attachment</option>
            <option value="two_attachments">Two Attachments</option>
            <option value="google_drive">Google Drive Share</option>
          </Select>

          <Input
            placeholder="Subject Line"
            value={editingScenario?.subjectLine || ''}
            onChange={(e) => setEditingScenario(prev => prev ? { ...prev, subjectLine: e.target.value } : null)}
            required
          />

          <Select
            value={editingScenario?.signatureId || ''}
            onChange={(e) => setEditingScenario(prev => prev ? { ...prev, signatureId: e.target.value } : null)}
            required
          >
            <option value="">Select a signature</option>
            {signatures.map((sig) => (
              <option key={sig.id} value={sig.id}>
                {sig.signatureName}
              </option>
            ))}
          </Select>

          <div className="space-y-2">
            <label className="text-sm font-medium">Customization Prompt</label>
            <Textarea
              value={editingScenario?.customizationPrompt || ''}
              onChange={(e) => setEditingScenario(prev => prev ? { ...prev, customizationPrompt: e.target.value } : null)}
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email Examples Prompt</label>
            <Textarea
              value={editingScenario?.emailExamplesPrompt || ''}
              onChange={(e) => setEditingScenario(prev => prev ? { ...prev, emailExamplesPrompt: e.target.value } : null)}
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isCreating ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                isCreating ? 'Create Scenario' : 'Update Scenario'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingScenario(null);
                setSelectedScenario(null);
                setIsCreating(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
} 