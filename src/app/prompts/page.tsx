'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-[#33475b] mb-8">Prompts</h1>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-24 bg-gray-200 rounded w-full" />
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
        <h1 className="text-3xl font-bold text-[#33475b]">Prompts</h1>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Prompt
        </Button>
      </div>

      {isCreating && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Create New Prompt</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newPrompt.name}
                onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                placeholder="Enter prompt name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={newPrompt.content}
                onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
                placeholder="Enter prompt content"
                className="min-h-[150px]"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Create Prompt</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {prompts.map((prompt) => (
          <Card key={prompt.id}>
            {editingPrompt?.id === prompt.id ? (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Input
                      value={editingPrompt.name}
                      onChange={(e) => setEditingPrompt({
                        ...editingPrompt,
                        name: e.target.value
                      })}
                    />
                    <Button variant="ghost" size="sm" onClick={() => setEditingPrompt(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={editingPrompt.content}
                    onChange={(e) => setEditingPrompt({
                      ...editingPrompt,
                      content: e.target.value
                    })}
                    className="min-h-[150px]"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave(editingPrompt)}>Save Changes</Button>
                    <Button variant="outline" onClick={() => setEditingPrompt(null)}>Cancel</Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>{prompt.name}</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingPrompt(prompt)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(prompt.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm">{prompt.content}</pre>
                </CardContent>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
} 