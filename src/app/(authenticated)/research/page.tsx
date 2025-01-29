'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Search, RefreshCw } from 'lucide-react';

interface ResearchResult {
  id: string;
  query: string;
  result: string;
  createdAt: string;
}

interface ResearchResponse {
  results: ResearchResult[];
  lastUpdated: string;
}

export default function ResearchPage() {
  const [data, setData] = React.useState<ResearchResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const { toast } = useToast();

  const fetchResults = async () => {
    try {
      const response = await fetch('/api/research');
      if (!response.ok) throw new Error('Failed to fetch research results');
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching research results:', error);
      toast({
        title: 'Error',
        description: 'Failed to load research results',
        variant: 'destructive',
      });
    }
  };

  React.useEffect(() => {
    fetchResults();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) throw new Error('Failed to perform research');
      
      const result = await response.json();
      setData(prev => ({
        results: [result, ...(prev?.results || [])],
        lastUpdated: new Date().toISOString()
      }));

      toast({
        title: 'Success',
        description: 'Research completed successfully',
      });
    } catch (error) {
      console.error('Research error:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform research',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#33475b] mb-2">Research</h1>
          <p className="text-base text-gray-600">
            Perform AI-powered research on companies and industries
          </p>
          {data?.lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {formatDate(data.lastUpdated)}
            </p>
          )}
        </div>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your research query..."
                  className="h-12"
                />
              </div>
              <Button 
                type="submit"
                disabled={loading || !query.trim()}
                className="bg-[#ff7a59] hover:bg-[#ff957a] text-white min-w-[120px]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Researching...
                  </>
                ) : (
                  'Research'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {data?.results.map((result) => (
          <Card key={result.id} className="overflow-hidden">
            <CardHeader className="bg-gray-50">
              <CardTitle className="text-lg font-semibold">
                {result.query}
              </CardTitle>
              <p className="text-sm text-gray-500">
                {formatDate(result.createdAt)}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose max-w-none">
                {result.result.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 
