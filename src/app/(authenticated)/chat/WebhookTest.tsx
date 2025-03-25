'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';

// Timeout for webhook requests (45 seconds)
const WEBHOOK_TIMEOUT_MS = 45000;

export default function WebhookTest() {
  const [webhookUrl, setWebhookUrl] = useState('https://n8n.srv768302.hstgr.cloud/webhook/setter');
  const [testResponse, setTestResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<string>('');
  const { toast } = useToast();
  const { data: session } = useSession();
  const [organizationId, setOrganizationId] = useState<string>('unknown');
  
  // Get the organization ID from the session when it's available
  useEffect(() => {
    if (session?.user?.organizationId) {
      setOrganizationId(session.user.organizationId);
    }
  }, [session]);
  
  // Test the webhook configuration
  const testWebhook = async () => {
    setIsLoading(true);
    setTestResponse(null);
    setRawResponse('');
    
    try {
      // Create a simple test message
      const testPayload = {
        sessionId: "test-session-" + Math.random().toString(36).substring(2, 9),
        messageId: "test-message-" + Math.random().toString(36).substring(2, 9),
        message: "Hello, this is a test message from ProfitReach",
        previousMessages: [
          {
            role: "user",
            content: "Hello, this is a test message from ProfitReach"
          }
        ],
        timestamp: new Date().toISOString(),
        source: "promptlm-app",
        version: "1.0.0",
        organizationId: organizationId // Include the organization ID in the test payload
      };
      
      // Create an AbortController with a timeout for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
      
      // Send the test message directly to the webhook URL with timeout
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal
      });
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Webhook test failed with status ${response.status}`);
      }
      
      // Get the raw response text
      const responseText = await response.text();
      setRawResponse(responseText);
      
      // Try to parse as JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError: any) {
        throw new Error(`Failed to parse response as JSON: ${parseError.message}`);
      }
      
      // Set the parsed response data
      setTestResponse(responseData);
      
      // Analyze the response and show a more helpful message
      let successMessage = 'The webhook is configured correctly.';
      
      // Try to extract the output based on our expected format
      if (Array.isArray(responseData) && responseData.length > 0) {
        const firstItem = responseData[0];
        if (firstItem && typeof firstItem.output === 'string') {
          // Found valid output in the expected format
          successMessage = 'Webhook returned valid response with options.';
          
          // Check if the chat_id matches our sessionId
          if (firstItem.chat_id !== testPayload.sessionId) {
            successMessage += ' Note: The returned chat_id does not match the sessionId we sent.';
          }
        }
      }
      
      toast({
        title: 'Webhook Test Successful',
        description: successMessage,
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Webhook test failed:', error);
      
      // Check if the error is a timeout
      if (error.name === 'AbortError') {
        setTestResponse({ error: 'The webhook request timed out after 45 seconds. This may indicate the webhook service is taking too long to respond.' });
        
        toast({
          title: 'Webhook Test Timed Out',
          description: 'The request timed out after 45 seconds.',
          variant: 'destructive',
        });
      } else {
        setTestResponse({ error: String(error) });
        
        toast({
          title: 'Webhook Test Failed',
          description: String(error),
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4 max-w-2xl mx-auto mt-6">
      <h2 className="text-xl font-bold">Webhook Configuration Test</h2>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Webhook URL</label>
        <input
          type="text"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="Enter webhook URL"
          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Organization ID</label>
        <input
          type="text"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          placeholder="Organization ID"
          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
        <p className="text-xs text-slate-500">
          {session?.user?.organizationId 
            ? "Using your current organization ID" 
            : "No organization found in your session"}
        </p>
      </div>
      
      <button
        onClick={testWebhook}
        disabled={isLoading || !webhookUrl}
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Testing...' : 'Test Webhook'}
      </button>
      
      {rawResponse && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Raw Response:</h3>
          <pre className="bg-slate-100 p-4 rounded-md overflow-x-auto text-sm">
            {rawResponse}
          </pre>
        </div>
      )}
      
      {testResponse && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Parsed Response:</h3>
          <pre className="bg-slate-100 p-4 rounded-md overflow-x-auto text-sm">
            {JSON.stringify(testResponse, null, 2)}
          </pre>
          
          {Array.isArray(testResponse) && testResponse.length > 0 && testResponse[0].output && (
            <div className="mt-4 border-t pt-4">
              <h3 className="text-lg font-medium mb-2">Extracted Output:</h3>
              <div className="whitespace-pre-wrap bg-white p-4 rounded-md border border-slate-200">
                {testResponse[0].output}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 