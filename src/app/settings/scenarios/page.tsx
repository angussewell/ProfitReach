'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Edit, Loader2, Search, X } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredScenarios = scenarios.filter(scenario =>
    scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scenario.scenarioType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f5f8fa]">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#2e475d]">Manage Scenarios</h1>
            <Button 
              onClick={() => {
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
              }}
              className="bg-[#ff7a59] hover:bg-[#ff8f73] transition-all duration-200 shadow-sm hover:shadow-md text-white border-0 rounded-lg px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Scenario
            </Button>
          </div>
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              className="pl-12 h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all duration-200 shadow-sm hover:shadow-md bg-white rounded-xl text-lg"
              placeholder="Search scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff7a59]" />
          </div>
        ) : !isCreating && !selectedScenario ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScenarios.map((scenario) => (
              <Card 
                key={scenario.id} 
                className="border-2 border-gray-100 hover:border-[#ff7a59] transition-all duration-200 transform hover:scale-[1.02] bg-white shadow-sm hover:shadow-md rounded-xl overflow-hidden cursor-pointer"
                onClick={() => handleEditScenario(scenario)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-[#2e475d]">
                      {scenario.name}
                    </CardTitle>
                    <Edit className="h-5 w-5 text-[#ff7a59]" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-gray-50/80 rounded-lg p-4 border border-gray-100">
                    <p className="text-sm font-medium text-[#2e475d]">Type: <span className="text-gray-600">{scenario.scenarioType}</span></p>
                    <p className="text-sm font-medium text-[#2e475d] mt-2">Subject: <span className="text-gray-600">{scenario.subjectLine}</span></p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl bg-white rounded-xl">
              <CardHeader className="pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-[#2e475d]">
                    {isCreating ? 'Create New Scenario' : 'Edit Scenario'}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setEditingScenario(null);
                      setSelectedScenario(null);
                      setIsCreating(false);
                    }}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-lg"
                    disabled={isSubmitting}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <form onSubmit={isCreating ? handleCreateScenario : handleUpdateScenario} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#2e475d]">Name</label>
                    <Input
                      value={editingScenario?.name || ''}
                      onChange={(e) => setEditingScenario(prev => prev ? { ...prev, name: e.target.value } : null)}
                      required
                      disabled={!isCreating}
                      className="h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg"
                      placeholder="Enter scenario name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#2e475d]">Type</label>
                    <Select
                      value={editingScenario?.scenarioType || ''}
                      onValueChange={(value: string) => {
                        setEditingScenario(prev => prev ? { ...prev, scenarioType: value } : null);
                      }}
                    >
                      <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple Email</SelectItem>
                        <SelectItem value="one_attachment">One Attachment</SelectItem>
                        <SelectItem value="two_attachments">Two Attachments</SelectItem>
                        <SelectItem value="google_drive">Google Drive Share</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#2e475d]">Subject Line</label>
                    <Input
                      value={editingScenario?.subjectLine || ''}
                      onChange={(e) => setEditingScenario(prev => prev ? { ...prev, subjectLine: e.target.value } : null)}
                      required
                      className="h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg"
                      placeholder="Enter subject line"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#2e475d]">Email Signature</label>
                    <Select
                      value={editingScenario?.signatureId || ''}
                      onValueChange={(value: string) => {
                        setEditingScenario(prev => prev ? { ...prev, signatureId: value } : null);
                      }}
                    >
                      <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg">
                        <SelectValue placeholder="Select signature" />
                      </SelectTrigger>
                      <SelectContent>
                        {signatures.map((sig) => (
                          <SelectItem key={sig.id} value={sig.id}>
                            {sig.signatureName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#2e475d]">Customization Prompt</label>
                    <Textarea
                      value={editingScenario?.customizationPrompt || ''}
                      onChange={(e) => setEditingScenario(prev => prev ? { ...prev, customizationPrompt: e.target.value } : null)}
                      required
                      className="min-h-[200px] border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg font-mono"
                      placeholder="Enter customization prompt"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#2e475d]">Email Examples Prompt</label>
                    <Textarea
                      value={editingScenario?.emailExamplesPrompt || ''}
                      onChange={(e) => setEditingScenario(prev => prev ? { ...prev, emailExamplesPrompt: e.target.value } : null)}
                      required
                      className="min-h-[200px] border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg font-mono"
                      placeholder="Enter email examples prompt"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-[#ff7a59] hover:bg-[#ff8f73] transition-all duration-200 text-white shadow-sm hover:shadow-md border-0 rounded-lg px-6 h-12 text-base"
                    >
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
                      className="border-2 border-gray-200 hover:bg-gray-50 text-[#2e475d] hover:border-[#ff7a59] transition-all rounded-lg px-6 h-12 text-base"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 