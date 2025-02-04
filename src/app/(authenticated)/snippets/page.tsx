'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, X, Search, Code2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { CodeEditor } from '@/components/ui/code-editor';
import { PageHeader } from '@/components/ui/page-header';
import { motion } from 'framer-motion';

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

        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            className="technical-input pl-10"
            placeholder="Search snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {editingSnippet && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-[90%] max-h-[90vh] lg:max-w-6xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-slate-800">
                    {editingSnippet.id ? 'Edit Snippet' : 'New Snippet'}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingSnippet(null)}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">Name</label>
                    <Input
                      value={editingSnippet.name}
                      onChange={(e) => setEditingSnippet({
                        ...editingSnippet,
                        name: e.target.value
                      })}
                      placeholder="Enter snippet name"
                      className="h-12 border-2 border-slate-200 focus:border-red-500 focus:ring-red-100 transition-all rounded-lg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">Content (HTML supported)</label>
                    <CodeEditor
                      value={editingSnippet.content}
                      onChange={(value) => setEditingSnippet({
                        ...editingSnippet,
                        content: value
                      })}
                      language="html"
                      className="min-h-[60vh]"
                      onSave={handleSave}
                      maxLength={8000}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="submit"
                      className="px-6 h-12 bg-red-500 hover:bg-red-600 text-white transition-all rounded-lg"
                    >
                      {editingSnippet.id ? 'Update' : 'Create'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingSnippet(null)}
                      className="px-6 h-12 border-2 border-slate-200 hover:bg-slate-50 text-slate-800 hover:border-red-500 transition-all rounded-lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

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
                      <Button
                        variant="ghost"
                        size="sm"
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