'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Add Label import
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'; // Import Dialog components
import { Plus, X, Search, FileCode } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header'; // Correct import path
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
        {/* Use PageHeader component */}
        <PageHeader 
          title="Attachments"
          description="Manage your attachments for use in scenarios"
        >
          <Button
            onClick={() => setEditingAttachment({})}
            className="bg-red-500 hover:bg-red-600 transition-all duration-200 shadow-sm hover:shadow-md text-white border-0 rounded-lg px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Attachment
          </Button>
        </PageHeader>

        <div className="flex items-center gap-4"> {/* Search bar row */}
          <div className="relative max-w-md flex-1"> {/* Adjusted max-width */}
             <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /> {/* Standard icon style */}
            <Input
              placeholder="Search attachments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9" // Standard padding for icon
            />
          </div>
        </div>

        {/* Attachment Editor Dialog */}
        <Dialog open={!!editingAttachment} onOpenChange={(open) => { if (!open) setEditingAttachment(null); }}>
          <DialogContent className="sm:max-w-[80%] lg:max-w-4xl max-h-[90vh] flex flex-col">
            {editingAttachment && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {editingAttachment.id ? 'Edit Attachment' : 'Create New Attachment'}
                  </DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="attachment-name">Name</Label>
                      <Input
                        id="attachment-name"
                        value={editingAttachment.name || ''}
                        onChange={(e) => setEditingAttachment({
                          ...editingAttachment,
                          name: e.target.value
                        })}
                        placeholder="Enter attachment name"
                        className="bg-background text-foreground" // Add explicit background and text colors
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="attachment-content">Content</Label>
                      <PromptInput
                        value={editingAttachment.content || ''}
                        onChange={(value) => setEditingAttachment({
                          ...editingAttachment,
                          content: value
                        })}
                        placeholder="Enter attachment content"
                        className="min-h-[40vh] border rounded-md" // Adjust height, add border
                      />
                    </div>
                  </form>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setEditingAttachment(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                  >
                    {editingAttachment.id ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

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
