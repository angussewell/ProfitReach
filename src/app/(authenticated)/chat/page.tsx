'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import ConversationSidebar from './ConversationSidebar';
import ThinkingAnimation from './ThinkingAnimation';
import WebhookTest from './WebhookTest';
import { CodeBlock } from './CodeBlock';
import { parseMessageContent } from './messageUtils';

// Message type definition
interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
  conversationId: string;
  processingId?: string; // Add optional field to track processing messages
  isProcessing?: boolean; // Flag to indicate if message is still processing
}

export default function ChatPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showWebhookTest, setShowWebhookTest] = useState(false);
  const [emailMode, setEmailMode] = useState<'new' | 'response'>('new');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Redirect if not admin
  useEffect(() => {
    if (session && session.user.role !== 'admin') {
      router.push('/');
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive',
      });
    }
  }, [session, router, toast]);

  // Load messages for the active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/chat/conversations/${activeConversationId}/messages`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to load messages. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [activeConversationId, toast]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create a new conversation
  const handleNewConversation = async () => {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }
      
      const data = await response.json();
      setActiveConversationId(data.id);
      setMessages([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create a new conversation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Select a conversation
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  // Handle conversation deletion
  const handleDeleteConversation = (id: string) => {
    // If the deleted conversation was the active one, clear the current view
    if (id === activeConversationId) {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  // Toggle webhook test panel
  const toggleWebhookTest = () => {
    setShowWebhookTest(!showWebhookTest);
  };

  // Handle email mode change
  const handleEmailModeChange = (mode: 'new' | 'response') => {
    setEmailMode(mode);
  };

  // Create a function to poll for message updates
  const pollForMessageUpdate = async (processingId: string, conversationId: string, maxAttempts = 30) => {
    let attempts = 0;
    setIsPolling(true);
    
    const poll = async () => {
      try {
        if (attempts >= maxAttempts) {
          console.log('Max polling attempts reached');
          // Delay to show animation completing
          setIsLoading(false);
          // Add a small delay before removing animation completely
          setTimeout(() => {
            setIsPolling(false);
          }, 500);
          return;
        }
        
        attempts++;
        
        // Fetch the latest messages for the conversation
        const response = await fetch(`/api/chat/conversations/${conversationId}/messages`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch message updates');
        }
        
        const messages = await response.json();
        
        // Find the processing message
        const updatedMessage = messages.find((msg: ChatMessage) => msg.id === processingId);
        
        if (updatedMessage) {
          // Check if the message has been updated (it will have content when ready)
          if (updatedMessage.content) {
            // Message has been updated with the real response, update the UI
            setMessages(messages.map((msg: ChatMessage) => {
              if (msg.id === processingId) {
                return { ...msg, isProcessing: false };
              }
              return msg;
            }));
            
            setIsLoading(false);
            // Add a small delay before removing animation completely
            setTimeout(() => {
              setIsPolling(false);
            }, 500);
            
            return true;
          }
        }
        
        // If message is still processing, wait and try again
        setTimeout(poll, 2000); // Poll every 2 seconds
      } catch (error) {
        console.error('Error polling for message update:', error);
        // Continue polling despite errors
        setTimeout(poll, 2000);
      }
    };
    
    // Start polling
    poll();
  };

  // Helper function to scroll to the bottom of the chat
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Send a message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (inputMessage.trim() === "" || !activeConversationId) return;
    
    setIsLoading(true);
    
    try {
      // Add the user message immediately for better UX
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        content: inputMessage,
        role: 'user',
        createdAt: new Date(),
        conversationId: activeConversationId
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setInputMessage('');
      
      // Scroll to bottom after user message is added
      scrollToBottom();
      
      // Make the API request
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
          previousMessages: messages,
          conversationId: activeConversationId,
          emailMode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Add the assistant's response but don't show processing dots
      const assistantMessage = {
        ...data,
        isProcessing: false // We're not showing dots anymore
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Start polling for updates if this is a processing message
      if (data.processingId) {
        // Set polling state to true before starting polling
        // This ensures no animation flicker during transition
        setIsPolling(true);
        pollForMessageUpdate(data.processingId, activeConversationId);
      } else {
        // If no processingId, we're done loading
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false); // Reset loading on error
    } finally {
      // Only reset isLoading here if we're not polling
      if (!isPolling) {
        setIsLoading(false);
      }
      // Scroll to bottom after receiving the response
      scrollToBottom();
    }
  };

  // Function to resize textarea based on content
  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set the height to scrollHeight to expand the textarea
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${newHeight}px`;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(e);
  };

  // Handle message input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    // Resize the textarea whenever content changes
    resizeTextarea();
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Handle Shift+Enter (add a new line)
    else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      // Insert a newline character at the cursor position
      const cursorPos = e.currentTarget.selectionStart || 0;
      const textBefore = inputMessage.substring(0, cursorPos);
      const textAfter = inputMessage.substring(cursorPos);
      
      const newValue = textBefore + '\n' + textAfter;
      setInputMessage(newValue);
      
      // Store the target element reference
      const textarea = e.currentTarget;
      
      // Set cursor position after the inserted newline
      setTimeout(() => {
        // Check if textarea is still available
        if (textarea && typeof textarea.selectionStart === 'number') {
          textarea.selectionStart = textarea.selectionEnd = cursorPos + 1;
          
          // Resize the textarea after adding a new line
          resizeTextarea();
        }
      }, 0);
    }
  };

  // Reset textarea height when clearing the input
  useEffect(() => {
    if (inputMessage === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputMessage]);

  // Test function for code blocks
  const insertTestCodeMessage = () => {
    if (!activeConversationId) return;
    
    const testMessage: ChatMessage = {
      id: `test-${Date.now()}`,
      content: `Here's an example of a code block:

\`\`\`javascript
function helloWorld() {
  console.log("Hello, world!");
  return true;
}
\`\`\`

And here's another code block with a different language:

\`\`\`python
def hello_world():
    print("Hello, world!")
    return True
\`\`\`

Regular text continues after the code blocks.`,
      role: 'assistant',
      createdAt: new Date(),
      conversationId: activeConversationId
    };
    
    setMessages(prev => [...prev, testMessage]);
  };

  // Test function for complex code blocks
  const insertComplexTestMessage = () => {
    if (!activeConversationId) return;
    
    const complexMessage: ChatMessage = {
      id: `complex-${Date.now()}`,
      content: `Here's a more complex example with nested code and inline code:

Sometimes you might have inline code like \`const x = 1;\` within text.

\`\`\`html
<div class="example">
  <pre>
    <code>
      // Nested code example
      function nested() {
        return true;
      }
    </code>
  </pre>
</div>
\`\`\`

And here's one with special characters:

\`\`\`javascript
// Comment with backticks: \` example \`
const regex = /\`\`\`[\\s\\S]*?\`\`\`/g;
console.log("This is a test");
\`\`\`

End of the complex example.`,
      role: 'assistant',
      createdAt: new Date(),
      conversationId: activeConversationId
    };
    
    setMessages(prev => [...prev, complexMessage]);
  };

  if (session?.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-7xl mx-auto w-full px-4">
      <div className="flex-none mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-slate-800">Chat</h1>
            <p className="text-muted-foreground text-slate-500">Chat with your AI assistant</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Email Mode Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => handleEmailModeChange('new')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  emailMode === 'new'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                New Email
              </button>
              <button
                onClick={() => handleEmailModeChange('response')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  emailMode === 'response'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Response
              </button>
            </div>
            <button 
              onClick={toggleWebhookTest}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors underline-offset-4 hover:underline focus:outline-none"
              aria-label="Toggle webhook test panel"
            >
              {showWebhookTest ? 'Hide developer tools' : 'Developer tools'}
            </button>
          </div>
        </div>
      </div>
      
      {showWebhookTest && <WebhookTest />}

      <div className="flex flex-1 overflow-hidden rounded-xl shadow-sm border border-slate-200 mt-4 bg-white">
        {/* Conversation Sidebar */}
        <div className="w-72 flex-shrink-0 h-full bg-slate-50 border-r border-slate-200">
          <ConversationSidebar
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                {activeConversationId ? 'No messages yet. Start a conversation!' : 'Select or create a conversation to start chatting.'}
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex items-start group ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-3 flex-shrink-0 mt-1 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  )}
                  
                  <div 
                    className={`rounded-xl p-5 max-w-[75%] transition-shadow duration-200 ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 shadow-sm hover:shadow ring-1 ring-red-200/50' 
                        : 'bg-white text-slate-800 shadow-sm hover:shadow ring-1 ring-slate-200/60'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {parseMessageContent(message.content).map((part, index) => (
                        part.type === 'code' 
                          ? <CodeBlock key={index} code={part.content} language={part.language} />
                          : <span key={index}>{part.content}</span>
                      ))}
                    </div>
                    <div className="text-xs opacity-70 mt-2 text-right">
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center ml-3 flex-shrink-0 mt-1 shadow-sm">
                      <span className="text-red-600 font-medium text-sm">
                        {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
            {(isLoading || isPolling) && (
              <div className="flex justify-start mt-4">
                <ThinkingAnimation duration={20} complete={!isPolling && !isLoading} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-200 bg-white">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <textarea
                ref={textareaRef}
                placeholder={activeConversationId ? "Type your message... (Shift+Enter for new line)" : "Select or create a conversation to start"}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                disabled={isLoading || !activeConversationId}
                rows={1}
                style={{ 
                  resize: "none", 
                  overflow: "auto", 
                  minHeight: "44px",
                  maxHeight: "150px" 
                }}
                className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent shadow-sm transition-shadow duration-200"
              />
              <button 
                type="submit"
                disabled={!inputMessage.trim() || isLoading || !activeConversationId}
                className="p-3.5 bg-red-500 text-white rounded-xl hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
                aria-label="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 