'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Add Label import
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'; // Import Dialog components
import { Plus, X, Search, Code2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { CodeEditor } from '@/components/ui/code-editor';
import { PageHeader } from '@/components/ui/page-header';
import { motion } from 'framer-motion';
import { PromptInput } from '@/components/prompts/prompt-input';
import { Copy } from 'lucide-react'; // Import Copy icon
import { DuplicateSnippetDialog } from '@/components/snippets/DuplicateSnippetDialog'; // Import the new dialog

// Update Snippet interface if needed, though the dialog only needs id/name
interface Snippet {
  id: string;
  name: string;
  content: string;
}

export default function SnippetsPage(): JSX.Element {
  const [snippets, setSnippets] = React.useState<Snippet[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [editingSnippet, setEditingSnippet] = React.useState<Snippet | null>(null);
  const [snippetToDuplicate, setSnippetToDuplicate] = React.useState<Snippet | null>(null); // State for duplication target
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = React.useState(false); // State for modal visibility
  const { toast } = useToast();

  React.useEffect(() => {
    fetchSnippets();
  }, []);

  const fetchSnippets = async () => {
    try {
      const response = await fetch('/api/snippets');
      const data = await response.json();
      setSnippets(data);
    } catch (error) {
      console.error('Error fetching snippets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch snippets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingSnippet) return;

    try {
      const response = await fetch('/api/snippets' + (editingSnippet.id ? `/${editingSnippet.id}` : ''), {
        method: editingSnippet.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingSnippet.name,
          content: editingSnippet.content,
        }),
      });

      if (!response.ok) throw new Error('Failed to save snippet');

      toast({
        title: 'Success',
        description: `Snippet ${editingSnippet.id ? 'updated' : 'created'} successfully`,
      });

      setEditingSnippet(null);
      fetchSnippets();
    } catch (error) {
      console.error('Error saving snippet:', error);
      toast({
        title: 'Error',
        description: 'Failed to save snippet',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this snippet?')) return;

    try {
      const response = await fetch(`/api/snippets/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete snippet');

      toast({
        title: 'Success',
        description: 'Snippet deleted successfully',
      });

      fetchSnippets();
    } catch (error) {
      console.error('Error deleting snippet:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete snippet',
        variant: 'destructive',
      });
    }
  };

  // Handler to open the duplicate modal
  const handleDuplicateClick = (snippet: Snippet) => {
    setSnippetToDuplicate(snippet);
    setIsDuplicateModalOpen(true);
  };

  const filteredSnippets = snippets.filter(snippet =>
    snippet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <PageContainer>
        <PageHeader 
          title="Snippets"
          description="Manage your reusable content snippets"
        />
        <div className="technical-grid">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="technical-card animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-24 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader 
          title="Snippets"
          description="Manage your reusable content snippets">
          <Button 
            onClick={() => setEditingSnippet({ id: '', name: '', content: '' })}
            className="technical-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Snippet
          </Button>
        </PageHeader>

        <div className="relative max-w-md"> {/* Adjusted max-width */}
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /> {/* Standard icon style */}
          <Input
            className="pl-9" // Standard padding for icon
            placeholder="Search snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Snippet Editor Dialog */}
        <Dialog open={!!editingSnippet} onOpenChange={(open) => { if (!open) setEditingSnippet(null); }}>
          <DialogContent className="sm:max-w-[80%] lg:max-w-4xl max-h-[90vh] flex flex-col">
            {editingSnippet && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {editingSnippet.id ? 'Edit Snippet' : 'New Snippet'}
                  </DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                  <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="snippet-name">Name</Label>
                      <Input
                        id="snippet-name"
                        value={editingSnippet.name}
                        onChange={(e) => setEditingSnippet({
                          ...editingSnippet,
                          name: e.target.value
                        })}
                        placeholder="Enter snippet name"
                        className="bg-background text-foreground" // Add explicit background and text colors
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="snippet-content">Content (HTML supported)</Label>
                      <PromptInput
                        value={editingSnippet.content}
                        onChange={(value) => setEditingSnippet({
                          ...editingSnippet,
                          content: value
                        })}
                        placeholder="Enter snippet content"
                        className="min-h-[40vh] border rounded-md" // Adjust height, add border
                      />
                    </div>
                  </form>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setEditingSnippet(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                  >
                    {editingSnippet.id ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Duplicate Snippet Dialog */}
        <DuplicateSnippetDialog
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          snippet={snippetToDuplicate}
          refreshSnippets={fetchSnippets} // Pass the fetch function to refresh the list
        />

        <div className="technical-grid">
          {filteredSnippets.map((snippet) => (
            <motion.div
              key={snippet.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="technical-card group">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="technical-header">
                      {snippet.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSnippet(snippet)}
                        className="text-muted-foreground hover:text-primary hover:bg-primary/5"
                      >
                        Edit
                      </Button>
                      {/* Add Duplicate Button */}
                      <Button
                        variant="ghost"
                        size="icon" // Use icon size for consistency if desired, or keep sm
                        onClick={() => handleDuplicateClick(snippet)}
                        className="text-muted-foreground hover:text-primary hover:bg-primary/5 h-8 w-8" // Adjust size/padding if using 'icon'
                        aria-label={`Duplicate snippet ${snippet.name}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm" // Keep sm for Delete or adjust as needed
                        onClick={() => handleDelete(snippet.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/5"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-4 max-h-[100px] overflow-hidden relative">
                    <pre className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                      {snippet.content}
                    </pre>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-muted/30 to-transparent" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
