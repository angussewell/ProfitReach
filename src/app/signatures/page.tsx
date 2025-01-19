'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, X, Search } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
    
    try {
      // Ensure we have valid data
      if (!editingSignature) {
        throw new Error('No signature data available');
      }

      const signatureData = {
        id: editingSignature.id,
        signatureName: editingSignature.signatureName.trim(),
        signatureContent: editingSignature.signatureContent.trim()
      };

      // Validate before sending
      if (!signatureData.signatureName) {
        throw new Error('Signature name is required');
      }
      if (!signatureData.signatureContent) {
        throw new Error('Signature content is required');
      }

      console.log('Submitting signature data:', signatureData);

      const response = await fetch('/api/signatures', {
        method: 'POST',  // Unified endpoint for create/update
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signatureData)
      });

      const responseData = await response.json();
      console.log('Server response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.details?.join(', ') || responseData.error || 'Failed to save signature');
      }

      await fetchSignatures();
      toast({
        title: 'Success',
        description: 'Signature saved successfully'
      });
      setEditingSignature(null);
    } catch (error) {
      console.error('Failed to save signature:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save signature',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
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

  const filteredSignatures = signatures.filter(signature =>
    signature.signatureName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f5f8fa]">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#2e475d]">Email Signatures</h1>
            <Button 
              onClick={() => setEditingSignature({ id: '', signatureName: '', signatureContent: '' })}
              className="bg-[#ff7a59] hover:bg-[#ff8f73] transition-all duration-200 shadow-sm hover:shadow-md text-white border-0 rounded-lg px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Signature
            </Button>
          </div>
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              className="pl-12 h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all duration-200 shadow-sm hover:shadow-md bg-white rounded-xl text-lg"
              placeholder="Search signatures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {editingSignature && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl bg-white rounded-xl">
              <CardHeader className="pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-[#2e475d]">
                    {editingSignature.id ? 'Edit Signature' : 'Create New Signature'}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingSignature(null)}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#2e475d]">Name</label>
                    <Input
                      value={editingSignature.signatureName}
                      onChange={(e) => setEditingSignature({
                        ...editingSignature,
                        signatureName: e.target.value
                      })}
                      placeholder="Enter signature name"
                      className="h-12 border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#2e475d]">Content (HTML supported)</label>
                    <Textarea
                      value={editingSignature.signatureContent}
                      onChange={(e) => setEditingSignature({
                        ...editingSignature,
                        signatureContent: e.target.value
                      })}
                      placeholder="Enter signature content"
                      className="min-h-[400px] border-2 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]/20 transition-all rounded-lg font-mono"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button 
                      type="submit"
                      className="bg-[#ff7a59] hover:bg-[#ff8f73] transition-all duration-200 text-white shadow-sm hover:shadow-md border-0 rounded-lg px-6 h-12 text-base"
                    >
                      {editingSignature.id ? 'Save Changes' : 'Create Signature'}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setEditingSignature(null)}
                      className="border-2 border-gray-200 hover:bg-gray-50 text-[#2e475d] hover:border-[#ff7a59] transition-all rounded-lg px-6 h-12 text-base"
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
          {filteredSignatures.map((signature) => (
            <Card
              key={signature.id}
              className="border-2 border-gray-100 hover:border-[#ff7a59] transition-all duration-200 transform hover:scale-[1.02] bg-white shadow-sm hover:shadow-md rounded-xl overflow-hidden"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-[#2e475d]">
                    {signature.signatureName}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSignature(signature)}
                      className="text-gray-500 hover:text-[#ff7a59] hover:bg-[#ff7a59]/10"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(signature.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bg-gray-50/80 rounded-lg p-4 border border-gray-100">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: signature.signatureContent }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
} 