'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, Search, Eye } from 'lucide-react';
import { replaceVariables } from '@/lib/utils';

interface Prompt {
  id: string;
  name: string;
  content: string;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = React.useState<Prompt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingPrompt, setEditingPrompt] = React.useState<Prompt | null>(null);
  const [newPrompt, setNewPrompt] = React.useState({ name: '', content: '' });
  const [isCreating, setIsCreating] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedPrompts, setExpandedPrompts] = React.useState<Set<string>>(new Set());
  const [previewPrompt, setPreviewPrompt] = React.useState<Prompt | null>(null);
  const [previewVariables, setPreviewVariables] = React.useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prompts');
      if (!response.ok) throw new Error('Failed to fetch prompts');
      const data = await response.json();
      setPrompts(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch prompts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSave = async (prompt: Prompt) => {
    try {
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt),
      });
      
      if (!response.ok) throw new Error('Failed to update prompt');
      
      toast({
        title: 'Success',
        description: 'Prompt updated successfully',
      });
      
      setEditingPrompt(null);
      fetchPrompts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update prompt',
        variant: 'destructive',
      });
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrompt),
      });
      
      if (!response.ok) throw new Error('Failed to create prompt');
      
      toast({
        title: 'Success',
        description: 'Prompt created successfully',
      });
      
      setNewPrompt({ name: '', content: '' });
      setIsCreating(false);
      fetchPrompts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create prompt',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete prompt');
      
      toast({
        title: 'Success',
        description: 'Prompt deleted successfully',
      });
      
      fetchPrompts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete prompt',
        variant: 'destructive',
      });
    }
  };

  const togglePrompt = (id: string) => {
    const newExpanded = new Set(expandedPrompts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPrompts(newExpanded);
  };

  const filteredPrompts = React.useMemo(() => {
    if (!searchQuery) return prompts;
    const query = searchQuery.toLowerCase();
    return prompts.filter(
      prompt => 
        prompt.name.toLowerCase().includes(query) || 
        prompt.content.toLowerCase().includes(query)
    );
  }, [prompts, searchQuery]);

  // Extract variables from prompt content
  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(match => match.slice(2, -2)))];
  };

  // Highlight variables in prompt content
  const highlightVariables = (content: string): JSX.Element => {
    const parts = content.split(/(\{\{\w+\}\})/g);
    return (
      <>
        {parts.map((part, index) => {
          if (part.match(/\{\{\w+\}\}/)) {
            return <span key={index} className="bg-[#ff7a59]/10 text-[#ff7a59] px-1 rounded">{part}</span>;
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  // Preview modal component
  const PreviewModal = ({ prompt }: { prompt: Prompt }) => {
    const variables = extractVariables(prompt.content);
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl bg-white rounded-xl">
          <CardHeader className="pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-[#2e475d]">Preview Prompt: {prompt.name}</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPreviewPrompt(null)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-lg"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-8">
            {variables.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-[#2e475d]">Variables</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {variables.map(variable => (
                    <div key={variable} className="space-y-2">
                      <label className="text-sm font-medium text-[#2e475d]">{variable}</label>
                      <Input
                        value={previewVariables[variable] || ''}
                        onChange={(e) => setPreviewVariables(prev => ({
                          ...prev,
                          [variable]: e.target.value
                        }))}
                        placeholder={`Enter value for ${variable}`}
                        className="h-10 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">No variables found in this prompt.</p>
            )}
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[#2e475d]">Preview</h3>
              <div className="bg-gray-50/80 rounded-lg p-4 border border-gray-100">
                <pre className="whitespace-pre-wrap text-sm text-[#2e475d] font-mono">
                  {replaceVariables(prompt.content, previewVariables)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f8fa]">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <h1 className="text-3xl font-bold text-[#2e475d] mb-8">Prompts</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-0 shadow-lg bg-white rounded-xl overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="h-6 bg-gray-200 rounded-lg w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="h-24 bg-gray-100 rounded-lg w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8fa]">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#2e475d]">Prompts</h1>
            <Button 
              onClick={() => setIsCreating(true)}
              className="bg-[#ff7a59] hover:bg-[#ff8f73] transition-all duration-200 shadow-sm hover:shadow-md text-white border-0 rounded-lg px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Prompt
            </Button>
          </div>
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              className="pl-12 h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all duration-200 shadow-sm hover:shadow-md bg-white rounded-xl text-lg"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isCreating && (
          <Card className="mb-8 border-0 shadow-xl bg-white rounded-xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-[#2e475d]">Create New Prompt</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-lg">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#2e475d]">Name</label>
                <Input
                  value={newPrompt.name}
                  onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                  placeholder="Enter prompt name"
                  className="h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#2e475d]">Content</label>
                <Textarea
                  value={newPrompt.content}
                  onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
                  placeholder="Enter prompt content"
                  className="min-h-[200px] border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={handleCreate}
                  className="bg-[#ff7a59] hover:bg-[#ff8f73] transition-all duration-200 text-white shadow-sm hover:shadow-md border-0 rounded-lg px-6 h-12 text-base"
                >
                  Create Prompt
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreating(false)}
                  className="border-2 border-gray-200 hover:bg-gray-50 text-[#2e475d] hover:border-[#ff7a59] transition-all rounded-lg px-6 h-12 text-base"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {editingPrompt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl bg-white rounded-xl">
              <CardHeader className="pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-[#2e475d]">Edit Prompt</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingPrompt(null)}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#2e475d]">Name</label>
                  <Input
                    value={editingPrompt.name}
                    onChange={(e) => setEditingPrompt({
                      ...editingPrompt,
                      name: e.target.value
                    })}
                    className="h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#2e475d]">Content</label>
                  <Textarea
                    value={editingPrompt.content}
                    onChange={(e) => setEditingPrompt({
                      ...editingPrompt,
                      content: e.target.value
                    })}
                    className="min-h-[400px] border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg font-mono"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button 
                    onClick={() => handleSave(editingPrompt)}
                    className="bg-[#ff7a59] hover:bg-[#ff8f73] transition-all duration-200 text-white shadow-sm hover:shadow-md border-0 rounded-lg px-6 h-12 text-base"
                  >
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingPrompt(null)}
                    className="border-2 border-gray-200 hover:bg-gray-50 text-[#2e475d] hover:border-[#ff7a59] transition-all rounded-lg px-6 h-12 text-base"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map((prompt) => (
            <Card 
              key={prompt.id} 
              className="group relative border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-xl overflow-hidden"
            >
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePrompt(prompt.id)}
                  className="bg-white/90 hover:bg-white shadow-sm hover:shadow-md rounded-lg text-gray-600 hover:text-[#ff7a59]"
                >
                  {expandedPrompts.has(prompt.id) ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreviewVariables({});
                    setPreviewPrompt(prompt);
                  }}
                  className="bg-white/90 hover:bg-white shadow-sm hover:shadow-md rounded-lg text-gray-600 hover:text-[#ff7a59]"
                >
                  <Eye className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingPrompt(prompt)}
                  className="bg-white/90 hover:bg-white shadow-sm hover:shadow-md rounded-lg text-gray-600 hover:text-[#ff7a59]"
                >
                  <Pencil className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(prompt.id)}
                  className="bg-white/90 hover:bg-white shadow-sm hover:shadow-md rounded-lg text-gray-600 hover:text-[#ff7a59]"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-[#2e475d] pr-24">{prompt.name}</CardTitle>
              </CardHeader>
              {expandedPrompts.has(prompt.id) && (
                <CardContent className="pt-0">
                  <div className="bg-gray-50/80 rounded-lg p-4 border border-gray-100">
                    <pre className="whitespace-pre-wrap text-sm text-[#2e475d] font-mono">
                      {highlightVariables(prompt.content)}
                    </pre>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>

      {previewPrompt && <PreviewModal prompt={previewPrompt} />}
    </div>
  );
} 