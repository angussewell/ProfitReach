'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, CheckSquare, X, Search } from 'lucide-react';

interface Signature {
  id: string;
  signatureName: string;
  signatureContent: string;
}

interface Scenario {
  id: string;
  name: string;
  totalCount: number;
  positiveReplyCount: number;
  currentCount: number;
  customizationPrompt: string;
  emailExamplesPrompt: string;
  signatureId: string;
  error?: boolean;
}

export default function ScenariosPage() {
  const [data, setData] = React.useState<Scenario[]>([]);
  const [signatures, setSignatures] = React.useState<Signature[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingScenario, setEditingScenario] = React.useState<Scenario | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { toast } = useToast();

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hubspot/contacts/past-scenarios');
      const data = await response.json();
      setData(data.scenarios || []);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch scenarios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSignatures = async () => {
    try {
      const response = await fetch('/api/signatures');
      if (!response.ok) throw new Error('Failed to fetch signatures');
      const data = await response.json();
      setSignatures(data);
    } catch (error) {
      console.error('Error fetching signatures:', error);
    }
  };

  React.useEffect(() => {
    fetchScenarios();
    fetchSignatures();
  }, []);

  const handleSave = async (scenario: Scenario) => {
    try {
      const response = await fetch(`/api/scenarios/${scenario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
      });
      
      if (!response.ok) throw new Error('Failed to update scenario');
      
      toast({
        title: 'Success',
        description: 'Scenario updated successfully',
      });
      
      setEditingScenario(null);
      fetchScenarios();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update scenario',
        variant: 'destructive',
      });
    }
  };

  const filteredScenarios = React.useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(scenario => 
      scenario.name.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#33475b] mb-2">All Scenarios</h1>
            <p className="text-base text-gray-600">Loading scenario data...</p>
          </div>
          <Button disabled>
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="h-10 bg-gray-200 rounded w-2/3" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#33475b] mb-2">All Scenarios</h1>
          <p className="text-base text-gray-600">
            Track and manage your email scenarios
          </p>
        </div>
        <Button onClick={fetchScenarios}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search scenarios..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredScenarios.map((scenario) => (
          <Card 
            key={scenario.id} 
            className="hover:border-[#ff7a59] transition-all duration-200 transform hover:scale-[1.02] cursor-pointer bg-white shadow-sm hover:shadow-md"
            onClick={() => setEditingScenario(scenario)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckSquare className="w-5 h-5 text-[#ff7a59]" />
                {scenario.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#ff7a59]">
                    {scenario.totalCount.toLocaleString()}
                  </span>
                  <span className="text-gray-600">Total Contacts</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-[#00bda5]">
                    {scenario.positiveReplyCount.toLocaleString()}
                  </span>
                  <span className="text-gray-600">Responses</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-[#516f90]">
                    {scenario.currentCount.toLocaleString()}
                  </span>
                  <span className="text-gray-600">Currently Active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingScenario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#33475b]">Edit Scenario</h2>
              <Button variant="ghost" onClick={() => setEditingScenario(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Scenario Name</label>
                <Input
                  value={editingScenario.name}
                  onChange={(e) => setEditingScenario({
                    ...editingScenario,
                    name: e.target.value
                  })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Signature</label>
                <Select
                  value={editingScenario.signatureId}
                  onChange={(e) => setEditingScenario({
                    ...editingScenario,
                    signatureId: e.target.value
                  })}
                >
                  <option value="">Select a signature</option>
                  {signatures.map((sig) => (
                    <option key={sig.id} value={sig.id}>
                      {sig.signatureName}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Customization Prompt</label>
                <Textarea
                  value={editingScenario.customizationPrompt}
                  onChange={(e) => setEditingScenario({
                    ...editingScenario,
                    customizationPrompt: e.target.value
                  })}
                  className="min-h-[150px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Examples Prompt</label>
                <Textarea
                  value={editingScenario.emailExamplesPrompt}
                  onChange={(e) => setEditingScenario({
                    ...editingScenario,
                    emailExamplesPrompt: e.target.value
                  })}
                  className="min-h-[150px]"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => handleSave(editingScenario)}>
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingScenario(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 