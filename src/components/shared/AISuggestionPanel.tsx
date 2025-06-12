{'\'use client\';'}

import * as React from 'react';
// Import useEffect
import { useState, useCallback, useEffect } from 'react'; 
import { SuggestionBox } from './SuggestionBox';
import { ClientButton } from '@/components/ui/client-components';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Define the expected shape of the message prop
// Should match the relevant fields from FullEmailMessage/FollowUpQueueItem
interface LatestMessageInfo {
  id: string;
  messageId: string;
  threadId: string;
  organizationId?: string;
  emailAccountId?: string | null;
  subject: string | null;
  sender: string | null;
  recipientEmail: string | null;
  content: string | null;
  receivedAt: string; // Assuming string from API
  messageType: string; // Use string for flexibility if needed
  isRead: boolean;
  classificationScores?: any | null; // Use any or a specific JSON type
  unipileEmailId?: string | null;
  status?: string | null; // Use string for flexibility
  messageSource?: string | null; // Use string
  socialAccountId?: string | null;
  aiSuggestion1?: string | null;
  aiSuggestion2?: string | null;
  aiSuggestion3?: string | null;
} // <-- Added missing closing brace for LatestMessageInfo

// Define the shape for the suggestions prop
interface Suggestions {
  s1: string | null;
  s2: string | null;
  s3: string | null;
}

interface AISuggestionPanelProps {
  latestMessage: LatestMessageInfo | null; // Still needed for payload generation
  suggestions: Suggestions; // Prop to receive current suggestions for display
  onUseSuggestion: (suggestion: string) => void;
  // Callback to update parent with new suggestions from webhook
  onSuggestionsUpdated: (suggestions: Suggestions) => void; // Make required for clarity
}

export function AISuggestionPanel({ 
  latestMessage, 
  suggestions, // Use this for display
  onUseSuggestion, 
  onSuggestionsUpdated 
}: AISuggestionPanelProps) {
  const [gettingSuggestions, setGettingSuggestions] = useState(false);
  const [userSuggestionInput, setUserSuggestionInput] = useState('');
  
  // Update user input if the message context changes (e.g., navigating threads)
  useEffect(() => {
    setUserSuggestionInput(''); // Reset input when message changes
  }, [latestMessage?.id]);

  const handleGetAISuggestions = useCallback(async () => {
    if (!latestMessage) {
      toast.error("Cannot get suggestions: No message data available.");
      return;
    }

    setGettingSuggestions(true);
    toast.info("Requesting new AI suggestions...");

    try {
      // Construct payload matching the structure expected by the Universal Inbox logic
      const payload = [
        {
          id: latestMessage.id,
          messageId: latestMessage.messageId,
          threadId: latestMessage.threadId,
          organizationId: latestMessage.organizationId,
          emailAccountId: latestMessage.emailAccountId,
          subject: latestMessage.subject,
          sender: latestMessage.sender,
          recipientEmail: latestMessage.recipientEmail,
          content: latestMessage.content, // Raw content
          receivedAt: latestMessage.receivedAt,
          messageType: latestMessage.messageType,
          isRead: latestMessage.isRead,
          classificationScores: latestMessage.classificationScores,
          unipileEmailId: latestMessage.unipileEmailId,
          status: latestMessage.status,
          messageSource: latestMessage.messageSource,
          socialAccountId: latestMessage.socialAccountId,
          userSuggestion: userSuggestionInput // Include user's optional suggestion
        }
      ];

      console.log('[AISuggestionPanel] Sending payload to external webhook:', payload);

      // Call the EXTERNAL webhook endpoint
      const response = await fetch('https://n8n-n8n.swl3bc.easypanel.host/webhook/aisuggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Log the raw response text for debugging potential JSON parsing issues
      const responseText = await response.text();
      console.log('[AISuggestionPanel] Raw webhook response text:', responseText);

      if (!response.ok) {
        // Try to parse error, but use raw text if parsing fails
        let errorDetails = responseText;
        try {
          const errorData = JSON.parse(responseText);
          errorDetails = errorData.error || errorData.message || responseText;
        } catch (parseError) {
          // Ignore parsing error, use raw text
        }
        throw new Error(`Webhook request failed: ${response.status} - ${errorDetails}`);
      }

      // Parse the successful JSON response
      const data = JSON.parse(responseText); 
      console.log('[AISuggestionPanel] Received suggestions response:', data);

      // Extract suggestions - adjust based on actual webhook response structure
      // Assuming the webhook returns an object like { suggestions: { s1: '...', s2: '...', s3: '...' } }
      const newSuggestions = {
        s1: data?.suggestions?.s1 ?? null,
        s2: data?.suggestions?.s2 ?? null,
        s3: data?.suggestions?.s3 ?? null,
      };

      // Call the callback to update the parent component's state
      onSuggestionsUpdated(newSuggestions);
      // Parent component will show toast on successful state update

    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      // Show specific error message if available
      toast.error(`Failed to get AI suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGettingSuggestions(false);
    }
  }, [latestMessage, userSuggestionInput, onSuggestionsUpdated]); // Add onSuggestionsUpdated dependency

  return (
    <div className="pt-6 border-t border-slate-200/60">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-medium text-slate-800 flex items-center">
            <Sparkles className="w-4 h-4 mr-2 inline text-blue-600" />
            AI Suggested Replies
          </h3>
          {/* <p className="text-xs text-slate-500 mt-1">Scroll to view all suggestions</p> */}
        </div>
        <ClientButton
          onClick={handleGetAISuggestions}
          disabled={gettingSuggestions || !latestMessage}
          size="sm"
        >
          {gettingSuggestions ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-1" />
              <span>Regenerate</span>
            </>
          )}
        </ClientButton>
      </div>

      {/* User Suggestion Input */}
      <div className="mb-4">
        <label htmlFor="userSuggestionInputPanel" className="block text-xs font-medium text-slate-600 mb-1">
          Optional: Add context or instructions for AI
        </label>
        <Textarea
          id="userSuggestionInputPanel"
          value={userSuggestionInput}
          onChange={(e) => setUserSuggestionInput(e.target.value)}
          placeholder="e.g., Keep it brief, mention the discount..."
          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y min-h-[50px] bg-white text-slate-900 text-sm"
          rows={2}
        />
      </div>

      {/* Suggestion Boxes */}
      {/* Suggestion Boxes - Read from the suggestions prop */}
      <div className="space-y-3 pr-2">
        <SuggestionBox suggestion={suggestions.s1} index={1} onUseSuggestion={onUseSuggestion} />
        <SuggestionBox suggestion={suggestions.s2} index={2} onUseSuggestion={onUseSuggestion} />
        <SuggestionBox suggestion={suggestions.s3} index={3} onUseSuggestion={onUseSuggestion} />
      </div>
    </div>
  );
}
