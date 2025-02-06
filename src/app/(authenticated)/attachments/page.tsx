'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, X, Search, FileCode } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import { CodeEditor } from '@/components/ui/code-editor';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { PromptInput } from '@/components/prompts/prompt-input';

interface Attachment {
  id?: string;
  name?: string;
  content?: string;
}

export default function AttachmentsPage(): JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [editingAttachment, setEditingAttachment] = React.useState<Attachment | null>(null);

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
    attachment.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attachment.content?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 mx-0 px-8 py-8 rounded-xl shadow-lg">
          <h1 className="text-3xl font-bold text-white mb-2">Attachments</h1>
          <p className="text-slate-300">Manage your attachments for use in scenarios</p>
          <div className="mt-4">
            <Button
              onClick={() => setEditingAttachment({})}
              className="bg-red-500 hover:bg-red-600 transition-all duration-200 shadow-sm hover:shadow-md text-white border-0 rounded-lg px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Attachment
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Input
              placeholder="Search attachments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 border-2 border-slate-200 focus:border-red-500 focus:ring-red-100 transition-all rounded-lg"
            />
          </div>
        </div>

        {editingAttachment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-[90%] max-h-[90vh] lg:max-w-6xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-slate-800">
                    {editingAttachment.id ? 'Edit Attachment' : 'Create New Attachment'}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingAttachment(null)}
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
                      value={editingAttachment.name || ''}
                      onChange={(e) => setEditingAttachment({
                        ...editingAttachment,
                        name: e.target.value
                      })}
                      placeholder="Enter attachment name"
                      className="h-12 border-2 border-slate-200 focus:border-red-500 focus:ring-red-100 transition-all rounded-lg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">Content</label>
                    <PromptInput
                      value={editingAttachment.content || ''}
                      onChange={(value) => setEditingAttachment({
                        ...editingAttachment,
                        content: value
                      })}
                      placeholder="Enter attachment content"
                      className="min-h-[60vh]"
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingAttachment(null)}
                      className="px-6 h-12 border-2 border-slate-200 hover:bg-slate-50 text-slate-800 hover:border-red-500 transition-all rounded-lg"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      className="px-6 h-12 bg-red-500 hover:bg-red-600 text-white transition-all rounded-lg"
                    >
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
                      onClick={() => handleDelete(attachment.id || '')}
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