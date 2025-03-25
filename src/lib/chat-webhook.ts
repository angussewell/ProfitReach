// Chat webhook service for sending and receiving messages
// Dynamically import uuid to avoid ESM/CJS issues
// @ts-ignore - Using dynamic require
const { v4: uuidv4 } = require('uuid');

// Types for webhook request and response
export interface WebhookMessageRequest {
  sessionId: string;
  messageId: string;
  message: string;
  previousMessages: {
    role: 'user' | 'assistant';
    content: string;
  }[];
  timestamp: string;
  source: string;
  version: string;
  organizationId: string;
  emailMode: 'new' | 'response';
}

export interface WebhookMessageResponse {
  chat_id: string;
  output: string;
  email_mode: 'new' | 'response';
}

// Default webhook URL - can be overridden in environment variables or settings
const DEFAULT_WEBHOOK_URL = 'https://n8n.srv768302.hstgr.cloud/webhook/setter';

// Timeout for webhook requests (150 seconds)
const WEBHOOK_TIMEOUT_MS = 150000;

/**
 * Sends a message to the webhook and returns the response
 */
export async function sendMessageToWebhook(
  message: string,
  previousMessages: { role: 'user' | 'assistant'; content: string }[],
  sessionId: string,
  organizationId: string,
  emailMode: 'new' | 'response' = 'new'
): Promise<string> {
  // Generate a unique message ID
  const messageId = uuidv4();
  
  // Create the webhook request payload
  const webhookRequest: WebhookMessageRequest = {
    sessionId,
    messageId,
    message,
    previousMessages,
    timestamp: new Date().toISOString(),
    source: "promptlm-app",
    version: "1.0.0",
    organizationId,
    emailMode
  };

  // Get the webhook URL from environment variables or use the default
  const webhookUrl = process.env.CHAT_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
  
  console.log('Sending webhook request to:', webhookUrl);
  console.log('Request payload:', JSON.stringify(webhookRequest, null, 2));

  try {
    // Create an AbortController with a timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    
    // Send the request to the webhook with the timeout signal
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookRequest),
      signal: controller.signal
    });
    
    // Clear the timeout since the request completed
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Webhook request failed with status ${response.status}`);
    }

    // Get the raw response text first for logging
    const responseText = await response.text();
    console.log('Webhook raw response:', responseText);
    
    // Try to parse the response as JSON
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse webhook response as JSON:', parseError);
      throw new Error('Invalid JSON response from webhook');
    }
    
    console.log('Parsed webhook response:', JSON.stringify(responseData, null, 2));
    
    // More flexible validation
    if (!responseData) {
      console.error('Empty response from webhook');
      throw new Error('Empty response from webhook');
    }
    
    // Handle array responses (expected format)
    if (Array.isArray(responseData)) {
      if (responseData.length === 0) {
        console.error('Webhook returned empty array');
        throw new Error('Webhook returned empty array');
      }
      
      // Extract the first item
      const firstResponse = responseData[0];
      
      // Verify the response has the required output field
      if (!firstResponse || typeof firstResponse.output !== 'string') {
        console.error('Invalid response item format:', firstResponse);
        throw new Error('Invalid webhook response format: missing output field');
      }
      
      // Log but don't fail on chat_id mismatch or missing chat_id
      if (firstResponse.chat_id) {
        if (firstResponse.chat_id !== sessionId) {
          console.warn(`Session ID mismatch: expected ${sessionId}, got ${firstResponse.chat_id}`);
        }
      } else {
        console.warn('Response missing chat_id field');
      }
      
      // Return the output message
      return firstResponse.output;
    } 
    // Handle non-array responses as a fallback
    else if (typeof responseData === 'object' && responseData !== null) {
      // Check if the response has the required output field
      if (typeof responseData.output !== 'string') {
        console.error('Invalid response format (non-array):', responseData);
        throw new Error('Invalid webhook response format: missing output field');
      }
      
      // Log but don't fail on chat_id mismatch or missing chat_id
      if (responseData.chat_id) {
        if (responseData.chat_id !== sessionId) {
          console.warn(`Session ID mismatch: expected ${sessionId}, got ${responseData.chat_id}`);
        }
      } else {
        console.warn('Response missing chat_id field');
      }
      
      // Return the output message
      return responseData.output;
    }
    // No recognized format
    else {
      console.error('Unrecognized response format:', responseData);
      throw new Error('Unrecognized webhook response format');
    }
  } catch (error: any) {
    // Check if the error is a timeout
    if (error.name === 'AbortError') {
      console.error('Webhook request timed out after 45 seconds');
      throw new Error('The request to our AI service timed out. Please try again later.');
    }
    
    console.error('Error calling webhook:', error);
    throw error;
  }
} 