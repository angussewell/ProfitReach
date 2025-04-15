import { useState } from 'react';
import { toast } from 'sonner';

interface Organization {
  id: string;
}

interface DataSettingsProps {
  organization: Organization | null;
}

export function DataSettings({ organization }: DataSettingsProps) {
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [tags, setTags] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLinkedInUrl(e.target.value);
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTags(e.target.value);
  };

  const handleEnrich = async () => {
    if (!linkedInUrl.trim()) {
      toast.error('Please enter a LinkedIn Sales Navigator URL');
      return;
    }

    if (!tags.trim()) {
      toast.error('Please enter at least one tag');
      return;
    }

    if (!linkedInUrl.includes('linkedin.com/sales/')) {
      toast.error('Please enter a valid LinkedIn Sales Navigator URL');
      return;
    }

    setIsEnriching(true);
    try {
      const response = await fetch('https://n8n.srv768302.hstgr.cloud/webhook/contact-enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: linkedInUrl,
          organizationId: organization?.id || '',
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to enrich data');
      }

      toast.success('Data enrichment process initiated successfully');
      setLinkedInUrl('');
      setTags('');
    } catch (error) {
      console.error('Error enriching data:', error);
      toast.error('Failed to process enrichment request');
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-[#2e475d] mb-4">LinkedIn Sales Navigator Enrichment</h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter a LinkedIn Sales Navigator URL to enrich your data. This will process the URL and extract valuable information.
          </p>
          <div className="space-y-3">
            <div className="flex-1">
              <label htmlFor="linkedin-url" className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn Sales Navigator URL *
              </label>
              <input
                id="linkedin-url"
                type="text"
                value={linkedInUrl}
                onChange={handleUrlChange}
                placeholder="Enter LinkedIn Sales Navigator URL"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                The URL should be from LinkedIn Sales Navigator (e.g., https://www.linkedin.com/sales/company/...)
              </p>
            </div>
            
            <div className="flex-1">
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags *
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={handleTagsChange}
                placeholder="Enter comma-separated tags (e.g., tag1,tag2,tag3)"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Add comma-separated tags without spaces between commas (format: tag1,tag2,tag3)
              </p>
            </div>
            
            <div className="flex justify-end mt-2">
              <button
                onClick={handleEnrich}
                disabled={isEnriching || !linkedInUrl.trim() || !tags.trim()}
                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                  isEnriching || !linkedInUrl.trim() || !tags.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isEnriching ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin">⟳</div>
                    <span>Enriching...</span>
                  </div>
                ) : (
                  'Enrich'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
