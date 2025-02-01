'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, X, Search, FileCode } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { CodeEditor } from '@/components/ui/code-editor';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Attachment {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function AttachmentsPage(): JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAttachment, setEditingAttachment] = useState<Partial<Attachment> | null>(null);

  useEffect(() => {
    fetchAttachments();
  }, []);

  const fetchAttachments = async () => {
    try {
      const response = await fetch('/api/attachments');
      if (!response.ok) {
        throw new Error('Failed to fetch attachments');
      }
      const data = await response.json();
      setAttachments(data);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      setAttachments([]);
      toast({
        title: 'Error',
        description: 'Failed to fetch attachments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttachment?.name || !editingAttachment?.content) return;

    try {
      const response = await fetch('/api/attachments', {
        method: editingAttachment.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAttachment),
      });

      if (!response.ok) throw new Error('Failed to save attachment');

      const savedAttachment = await response.json();
      
      if (editingAttachment.id) {
        setAttachments(attachments.map(a => 
          a.id === savedAttachment.id ? savedAttachment : a
        ));
      } else {
        setAttachments([...attachments, savedAttachment]);
      }

      setEditingAttachment(null);
      toast({
        title: 'Success',
        description: `Attachment ${editingAttachment.id ? 'updated' : 'created'} successfully.`,
      });
    } catch (error) {
      console.error('Failed to save attachment:', error);
      toast({
        title: 'Error',
        description: 'Failed to save attachment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/attachments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete attachment');

      setAttachments(attachments.filter(a => a.id !== id));
      toast({
        title: 'Success',
        description: 'Attachment deleted successfully.',
      });
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete attachment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const filteredAttachments = attachments.filter(attachment =>
    attachment.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#2e475d]">Attachments</h1>
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
      <div className="space-y-6">
        <PageHeader
          title="Attachments"
          description="Manage your attachments for use in scenarios."
        >
          <Button
            onClick={() => setEditingAttachment({})}
            className="technical-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Attachment
          </Button>
        </PageHeader>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Input
              placeholder="Search attachments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="technical-input"
            />
          </div>
        </div>

        {editingAttachment && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="technical-card w-full max-w-2xl">
              <CardHeader className="pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="technical-header">
                    {editingAttachment.id ? 'Edit Attachment' : 'Create New Attachment'}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingAttachment(null)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-2">
                    <label className="technical-label">Name</label>
                    <Input
                      value={editingAttachment.name || ''}
                      onChange={(e) => setEditingAttachment({
                        ...editingAttachment,
                        name: e.target.value
                      })}
                      placeholder="Enter attachment name"
                      className="technical-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="technical-label">Content</label>
                    <CodeEditor
                      value={editingAttachment.content || ''}
                      onChange={(value) => setEditingAttachment({
                        ...editingAttachment,
                        content: value
                      })}
                      language="html"
                      className="min-h-[400px] border-2 border-slate-200 focus-within:border-red-500 focus-within:ring-red-100 transition-all rounded-lg"
                      onSave={handleSave}
                      maxLength={8000}
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingAttachment(null)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingAttachment.id ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="technical-grid">
          {filteredAttachments.map((attachment) => (
            <Card
              key={attachment.id}
              className="technical-card group"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="technical-header">
                    {attachment.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingAttachment(attachment)}
                      className="text-muted-foreground hover:text-primary hover:bg-primary/5"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(attachment.id)}
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
                    {attachment.content}
                  </pre>
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-muted/30 to-transparent" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
} 