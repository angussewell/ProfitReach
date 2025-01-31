'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, X, Search, Code2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';

interface Snippet {
  id: string;
  name: string;
  content: string;
}

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const { toast } = useToast();

  useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#2e475d]">Snippets</h1>
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-800">Snippets</h1>
          <Button 
            onClick={() => setEditingSnippet({ id: '', name: '', content: '' })}
            className="bg-red-500 hover:bg-red-600 transition-all duration-200 shadow-sm hover:shadow-md text-white border-0 rounded-lg px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Snippet
          </Button>
        </div>

        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            className="pl-12 h-12 border-2 border-slate-200 focus:border-red-500 focus:ring-red-100 transition-all duration-200 shadow-sm hover:shadow-md bg-white rounded-xl text-lg"
            placeholder="Search snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {editingSnippet && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl bg-white rounded-xl">
              <CardHeader className="pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-slate-800">
                    {editingSnippet.id ? 'Edit Snippet' : 'Create New Snippet'}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingSnippet(null)}
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
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
                    <Textarea
                      value={editingSnippet.content}
                      onChange={(e) => setEditingSnippet({
                        ...editingSnippet,
                        content: e.target.value
                      })}
                      placeholder="Enter snippet content"
                      className="min-h-[400px] border-2 border-slate-200 focus:border-red-500 focus:ring-red-100 transition-all rounded-lg font-mono"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button 
                      type="submit"
                      className="bg-red-500 hover:bg-red-600 transition-all duration-200 text-white shadow-sm hover:shadow-md border-0 rounded-lg px-6 h-12 text-base"
                    >
                      {editingSnippet.id ? 'Save Changes' : 'Create Snippet'}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setEditingSnippet(null)}
                      className="border-2 border-slate-200 hover:bg-slate-50 text-slate-800 hover:border-red-500 transition-all rounded-lg px-6 h-12 text-base"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSnippets.map((snippet) => (
            <Card
              key={snippet.id}
              className="border-2 border-slate-100 hover:border-red-500 transition-all duration-200 transform hover:scale-[1.02] bg-white shadow-sm hover:shadow-md rounded-xl overflow-hidden"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    {snippet.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSnippet(snippet)}
                      className="text-slate-500 hover:text-red-500 hover:bg-red-50"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(snippet.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 max-h-[100px] overflow-hidden relative">
                  <pre className="text-sm text-slate-600 font-mono whitespace-pre-wrap">
                    {snippet.content}
                  </pre>
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-50 to-transparent" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
} 