'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface Signature {
  id: string;
  signatureName: string;
  signatureContent: string;
}

export default function SignaturesPage() {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [editingSignature, setEditingSignature] = useState<Signature | null>(null);
  const [newSignature, setNewSignature] = useState({
    signatureName: '',
    signatureContent: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSignatures();
  }, []);

  const fetchSignatures = async () => {
    try {
      const response = await fetch('/api/signatures');
      if (!response.ok) throw new Error('Failed to fetch signatures');
      const data = await response.json();
      setSignatures(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load signatures',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/signatures', {
        method: editingSignature ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSignature || newSignature),
      });

      if (!response.ok) throw new Error('Failed to save signature');
      
      toast({
        title: 'Success',
        description: `Signature ${editingSignature ? 'updated' : 'created'} successfully`,
      });
      
      setNewSignature({ signatureName: '', signatureContent: '' });
      setEditingSignature(null);
      fetchSignatures();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save signature',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this signature?')) return;
    
    try {
      const response = await fetch(`/api/signatures?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete signature');
      
      toast({
        title: 'Success',
        description: 'Signature deleted successfully',
      });
      
      fetchSignatures();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete signature',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Email Signatures</h1>
      
      <form onSubmit={handleSubmit} className="mb-8 space-y-4 max-w-2xl">
        <Input
          placeholder="Signature Name"
          value={editingSignature?.signatureName || newSignature.signatureName}
          onChange={(e) => 
            editingSignature
              ? setEditingSignature({ ...editingSignature, signatureName: e.target.value })
              : setNewSignature({ ...newSignature, signatureName: e.target.value })
          }
          required
        />
        
        <Textarea
          placeholder="Signature Content (HTML supported)"
          value={editingSignature?.signatureContent || newSignature.signatureContent}
          onChange={(e) =>
            editingSignature
              ? setEditingSignature({ ...editingSignature, signatureContent: e.target.value })
              : setNewSignature({ ...newSignature, signatureContent: e.target.value })
          }
          required
          className="min-h-[200px]"
        />
        
        <div className="flex gap-2">
          <Button type="submit">
            {editingSignature ? 'Update Signature' : 'Create Signature'}
          </Button>
          {editingSignature && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingSignature(null)}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="space-y-4">
        {signatures.map((signature) => (
          <div
            key={signature.id}
            className="border p-4 rounded-lg space-y-2"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{signature.signatureName}</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSignature(signature)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(signature.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: signature.signatureContent }}
            />
          </div>
        ))}
      </div>
    </div>
  );
} 