'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'; // Keep Card for list items
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Textarea might not be used directly if PromptInput uses it internally
// import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label'; // Import Label
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger, // May not be needed if using state to control open
  DialogClose, // Useful for explicit close buttons if needed
} from '@/components/ui/dialog'; // Import Dialog components
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, Search, Eye, Copy } from 'lucide-react';
import { DuplicatePromptDialog } from '@/components/prompts/DuplicatePromptDialog';
// import { replaceVariables } from '@/lib/utils'; // Removed unused import
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header'; // Import PageHeader
import { CodeEditor } from '@/components/ui/code-editor';
import { VariableSelector } from '@/components/prompts/VariableSelector';
import { PromptInput } from '@/components/prompts/prompt-input';

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
  const [promptToDuplicate, setPromptToDuplicate] = React.useState<Prompt | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = React.useState(false);
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
    // Match both {{variable}} and {variable} formats
    const matches = content.match(/\{\{(\w+)\}\}|\{(\w+)\}/g) || [];
    // Clean up the matches to remove brackets
    return matches.map(match => match.replace(/[{}]/g, ''));
  };

  // Highlight variables in prompt content
  const highlightVariables = (content: string): JSX.Element => {
    // Split on both double and single bracketed variables
    const parts = content.split(/(\{\{\w+\}\}|\{\w+\})/g);
    return (
      <>
        {parts.map((part, index) => {
          if (part.match(/\{\{\w+\}\}|\{\w+\}/)) {
            return <span key={index} className="bg-red-100 text-red-500 px-1 rounded">{part}</span>;
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  // Preview modal component - Refactored to use Dialog
  const PreviewModal = ({ prompt }: { prompt: Prompt }) => {
    const variables = extractVariables(prompt.content);

    return (
      <Dialog open={!!prompt} onOpenChange={(open) => { if (!open) setPreviewPrompt(null); }}>
        <DialogContent className="sm:max-w-[80%] lg:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview Prompt: {prompt.name}</DialogTitle>
            {/* Optional: Add description if needed */}
            {/* <DialogDescription>Preview the prompt output with variable values.</DialogDescription> */}
          </DialogHeader>
          <div className="p-6 overflow-y-auto flex-1"> {/* Add padding here and make scrollable */}
            {variables.length > 0 ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Variables</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {variables.map(variable => (
                      <div key={variable} className="space-y-2">
                        <Label htmlFor={`preview-${variable}`}>{variable}</Label>
                        <Input
                          // id={`preview-${variable}`} // Removed id prop
                          value={previewVariables[variable] || ''}
                          onChange={(e) => setPreviewVariables(prev => ({
                            ...prev,
                            [variable]: e.target.value
                          }))}
                          placeholder={`Enter value for ${variable}`}
                          // Removed custom styling - rely on default Input style
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Preview</h3>
                  <div className="bg-muted rounded-md p-4 border">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {/* TODO: Fix or reimplement replaceVariables if needed */}
                      {/* {replaceVariables(prompt.content, previewVariables)} */}
                      {prompt.content} {/* Display raw content for now */}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Preview</h3>
                <div className="bg-muted rounded-md p-4 border">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {prompt.content}
                  </pre>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
             <DialogClose asChild>
               <Button variant="outline">Close</Button>
             </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-800">Prompts</h1>
          </div>
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
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        {/* Replace custom header with PageHeader component */}
         <PageHeader 
           title="Prompts"
           description="Manage your global prompt library"
         >
            {/* Keep the New Prompt button within the header actions */}
            <Button 
             variant="default" // Use default variant for primary action
             size="default" // Use standard size
             onClick={() => setIsCreating(true)}
             // Removed custom styling classes
           >
             <Plus className="w-4 h-4 mr-2" />
             New Prompt
          </Button>
        </PageHeader>

        <div className="flex items-center justify-between"> {/* Search bar row */}
          <div className="relative max-w-md flex-1"> {/* Adjusted max-width */}
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /> {/* Standard icon style */}
            <Input
              className="pl-9" // Standard padding for icon
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Button moved to PageHeader children */}
        </div>

        {/* --- New Prompt Modal --- */}
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent className="sm:max-w-[80%] lg:max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>New Prompt</DialogTitle>
              {/* <DialogDescription>Create a new reusable prompt.</DialogDescription> */}
            </DialogHeader>
            <div className="p-6 space-y-6 overflow-y-auto flex-1"> {/* Added padding and scroll */}
              <div className="space-y-2">
                <Label htmlFor="new-prompt-name">Name</Label>
                <Input
                  id="new-prompt-name"
                  value={newPrompt.name}
                  onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                  placeholder="Enter prompt name"
                  className="bg-background text-foreground" // Add explicit background and text colors
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-prompt-content">Content</Label>
                <PromptInput
                  // id="new-prompt-content" // Removed id prop
                  value={newPrompt.content}
                  onChange={(value) => setNewPrompt({ ...newPrompt, content: value })}
                  placeholder="Enter prompt content"
                  className="min-h-[40vh] border rounded-md" // Keep min-height, add border/rounding
                />
              </div>
            </div>
            <DialogFooter>
             <Button
               variant="secondary" // Use secondary for Cancel
               size="default" 
               onClick={() => setIsCreating(false)}
             >
               Cancel
             </Button>
             <Button
               variant="default" 
               size="default" 
               onClick={handleCreate}
             >
               Deploy Prompt
             </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- Edit Prompt Modal --- */}
        <Dialog open={editingPrompt !== null} onOpenChange={(open) => { if (!open) setEditingPrompt(null); }}>
          <DialogContent className="sm:max-w-[80%] lg:max-w-4xl max-h-[90vh] flex flex-col">
            {editingPrompt && ( // Ensure editingPrompt is not null before accessing its properties
              <>
                <DialogHeader>
                  <DialogTitle>Edit Prompt</DialogTitle>
                  {/* <DialogDescription>Modify the prompt details.</DialogDescription> */}
                </DialogHeader>
                <div className="p-6 space-y-6 overflow-y-auto flex-1"> {/* Added padding and scroll */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-prompt-name">Name</Label>
                    <Input
                      id="edit-prompt-name"
                      value={editingPrompt.name}
                      onChange={(e) => setEditingPrompt({
                        ...editingPrompt,
                        name: e.target.value
                      })}
                      className="bg-background text-foreground" // Add explicit background and text colors
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-prompt-content">Content</Label>
                    <PromptInput
                      // id="edit-prompt-content" // Removed id prop
                      value={editingPrompt.content}
                      onChange={(value) => setEditingPrompt({
                        ...editingPrompt,
                        content: value
                      })}
                      placeholder="Enter prompt content"
                      className="min-h-[40vh] border rounded-md" // Keep min-height, add border/rounding
                    />
                  </div>
                </div>
                <DialogFooter>
                 <Button
                   variant="secondary" // Use secondary for Cancel
                   size="default" 
                   onClick={() => setEditingPrompt(null)}
                 >
                   Cancel
                 </Button>
                 <Button
                   variant="default" 
                   size="default" 
                   onClick={() => handleSave(editingPrompt)}
                 >
                   Deploy Changes
                 </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map((prompt) => (
            <Card 
              key={prompt.id} 
              className="group relative border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-xl overflow-hidden"
            >
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => togglePrompt(prompt.id)}
                 >
                   {expandedPrompts.has(prompt.id) ? (
                     <ChevronUp className="w-5 h-5" />
                   ) : (
                     <ChevronDown className="w-5 h-5" />
                   )}
                 </Button>
                 <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => {
                     setPromptToDuplicate(prompt);
                     setIsDuplicateModalOpen(true);
                   }}
                   aria-label="Duplicate"
                 >
                   <Copy className="w-5 h-5" />
                 </Button>
                 <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => setEditingPrompt(prompt)}
                 >
                   <Pencil className="w-5 h-5" />
                 </Button>
                 <Button
                   variant="destructive"
                   size="icon"
                   onClick={() => handleDelete(prompt.id)}
                   className="text-red-600 hover:bg-red-50"
                 >
                   <Trash2 className="w-5 h-5" />
                 </Button>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-slate-800 pr-24">{prompt.name}</CardTitle>
              </CardHeader>
              {expandedPrompts.has(prompt.id) && (
                <CardContent className="pt-0">
                  <div className="bg-gray-50/80 rounded-lg p-4 border border-gray-100">
                    <pre className="whitespace-pre-wrap text-sm text-slate-800 font-mono">
                      {highlightVariables(prompt.content)}
                    </pre>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Render Preview Modal outside the main layout flow if it's controlled by state */}
      {previewPrompt && <PreviewModal prompt={previewPrompt} />}
      <DuplicatePromptDialog
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        prompt={promptToDuplicate}
        refreshPrompts={fetchPrompts}
      />
    </PageContainer>
  );
}
