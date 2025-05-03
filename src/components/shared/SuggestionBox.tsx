{'\'use client\';'}

import * as React from 'react';
// Assuming ClientButton is correctly set up for client-side use
// If not, import Button from '@/components/ui/button' and adjust usage
import { ClientButton } from '@/components/ui/client-components'; 

interface SuggestionBoxProps {
  suggestion: string | null | undefined;
  index: number;
  onUseSuggestion: (suggestion: string) => void;
}

export function SuggestionBox({ suggestion, index, onUseSuggestion }: SuggestionBoxProps) {
  const handleUseSuggestion = () => {
    if (suggestion) {
      // Trim whitespace from the suggestion before using it
      const trimmedSuggestion = suggestion.replace(/^\s+|\s+$/g, '');
      onUseSuggestion(trimmedSuggestion);
    }
  };

  return (
    <div className="relative rounded-md border border-slate-200 p-3 bg-slate-50/80 hover:bg-slate-100 transition-colors">
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-medium text-sm text-slate-700">AI Suggestion #{index}</h4>
        {suggestion && (
          <ClientButton
            variant="ghost"
            size="sm"
            onClick={handleUseSuggestion}
            className="text-blue-600 hover:text-blue-700 px-2" // Adjusted padding for ghost
          >
            Use This
          </ClientButton>
        )}
      </div>
      <div
        className={`text-xs ${suggestion ? 'text-slate-800' : 'text-slate-400 italic'} pr-2`}
      >
        {/* Use whitespace-pre-wrap to preserve line breaks */}
        <div className="whitespace-pre-wrap">
          {suggestion || `AI suggestion #${index} will appear here`}
        </div>
      </div>
    </div>
  );
}
