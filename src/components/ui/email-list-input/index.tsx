'use client';

import { useState, useMemo, useEffect } from 'react';

interface EmailListInputProps {
  emails: string[] | any;
  onChange: (emails: string[]) => void;
  placeholder?: string;
}

export function EmailListInput({ emails, onChange, placeholder = 'Add email address...' }: EmailListInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Debug log the input
  useEffect(() => {
    console.log('EmailListInput received emails prop:', emails);
    console.log('EmailListInput emails type:', typeof emails);
    if (Array.isArray(emails)) {
      console.log('EmailListInput emails is array with length:', emails.length);
    }
  }, [emails]);
  
  // Normalize emails to ensure it's always an array
  const normalizedEmails = useMemo(() => {
    if (!emails) {
      console.log('EmailListInput: emails prop is falsy, returning empty array');
      return [];
    }
    
    if (typeof emails === 'string') {
      console.log('EmailListInput: emails prop is string, attempting to parse');
      try {
        const parsed = JSON.parse(emails);
        console.log('EmailListInput: successfully parsed emails string to:', parsed);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('EmailListInput: failed to parse emails string:', e);
        return [];
      }
    }
    
    if (Array.isArray(emails)) {
      console.log('EmailListInput: emails prop is already an array');
      return emails;
    }
    
    console.log('EmailListInput: emails prop is unexpected type, returning empty array');
    return [];
  }, [emails]);

  // Simple email validation regex
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addEmail = () => {
    const trimmedEmail = inputValue.trim();
    
    if (!trimmedEmail) {
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (normalizedEmails.includes(trimmedEmail)) {
      setError('This email has already been added');
      return;
    }

    onChange([...normalizedEmails, trimmedEmail]);
    setInputValue('');
    setError(null);
  };

  const removeEmail = (email: string) => {
    onChange(normalizedEmails.filter((e: string) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    } else if (e.key === ',' && inputValue.trim()) {
      e.preventDefault();
      addEmail();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const pastedEmails = pasteData.split(/[,;\s]+/).filter(Boolean);
    
    const validEmails = pastedEmails.filter(email => isValidEmail(email));
    const uniqueEmails = validEmails.filter(email => !normalizedEmails.includes(email));
    
    if (uniqueEmails.length > 0) {
      onChange([...normalizedEmails, ...uniqueEmails]);
      setInputValue('');
      setError(null);
    } else if (validEmails.length !== pastedEmails.length) {
      setError('Some pasted emails were invalid');
    } else if (uniqueEmails.length === 0) {
      setError('All pasted emails already exist in the list');
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2">
        {normalizedEmails.map((email: string, index: number) => (
          <div
            key={index}
            className="flex items-center gap-1 bg-gray-100 text-gray-800 rounded-md px-2 py-1 text-sm"
          >
            <span>{email}</span>
            <button
              type="button"
              onClick={() => removeEmail(email)}
              className="text-gray-500 hover:text-gray-700 ml-1 px-1 rounded-sm hover:bg-gray-200"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (inputValue.trim()) {
              addEmail();
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
        />
        
        {inputValue && (
          <button
            type="button"
            onClick={addEmail}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-500 hover:bg-red-600 text-white rounded-md px-2 py-1 text-xs"
          >
            Add
          </button>
        )}
      </div>
      
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      
      <p className="mt-1 text-xs text-gray-500">
        Press Enter, comma, or click Add to add an email. You can also paste multiple emails separated by commas.
      </p>
    </div>
  );
} 