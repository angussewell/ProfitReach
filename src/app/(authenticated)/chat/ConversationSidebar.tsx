'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface ConversationProps {
  id: string;
  title: string | null;
  updatedAt: Date;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}

function ConversationItem({ id, title, updatedAt, active, onClick, onDelete }: ConversationProps) {
  // Show a preview of the title, or "New conversation" if no title
  const displayTitle = title || 'New conversation';
  const timeAgo = formatDistanceToNow(new Date(updatedAt), { addSuffix: true });
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <button
        onClick={onClick}
        className={`w-full px-3 py-3 text-left transition-all duration-200 rounded-lg ${
          active 
            ? 'bg-gradient-to-r from-red-50 to-red-100/50 text-red-800 shadow-sm ring-1 ring-red-200/50'
            : 'hover:bg-slate-100/80 text-slate-700 hover:text-slate-900'
        }`}
      >
        <div className="flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mt-0.5 text-slate-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{displayTitle}</div>
            <div className="text-xs text-slate-500 mt-0.5">{timeAgo}</div>
          </div>
        </div>
      </button>
      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this conversation?')) {
              onDelete();
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white shadow-sm border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors"
          aria-label="Delete conversation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
      )}
    </div>
  );
}

interface ConversationSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export default function ConversationSidebar({
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation
}: ConversationSidebarProps) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch conversations from the API
  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/chat/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Handle conversation deletion
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }
      
      // If the deleted conversation was active, we'll handle that in the parent component
      if (id === activeConversationId) {
        onDeleteConversation(id);
      }
      
      // Refresh the conversations list
      fetchConversations();
      
      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been permanently deleted.',
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Filter conversations based on search term
  const filteredConversations = searchTerm
    ? conversations.filter(conv => 
        (conv.title || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : conversations;

  return (
    <div className="h-full flex flex-col border-r border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <button
          onClick={onNewConversation}
          className="w-full py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm shadow-sm transition-colors duration-200 flex items-center justify-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span>New Chat</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-200">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search conversations"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-slate-500">
            <span className="text-sm">Loading conversations...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500">
            <span className="text-sm">No conversations yet</span>
            <button 
              onClick={onNewConversation}
              className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              id={conversation.id}
              title={conversation.title}
              updatedAt={conversation.updatedAt}
              active={conversation.id === activeConversationId}
              onClick={() => onSelectConversation(conversation.id)}
              onDelete={() => handleDelete(conversation.id)}
            />
          ))
        )}
      </div>
    </div>
  );
} 