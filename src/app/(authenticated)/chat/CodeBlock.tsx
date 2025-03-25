'use client';

import React, { useState, useRef } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      
      // Fallback for browsers that don't support clipboard API
      if (codeRef.current) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(codeRef.current);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand('copy');
        selection?.removeAllRanges();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };
  
  return (
    <div className="my-4 bg-slate-50 rounded-lg overflow-hidden border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
        <span className="text-xs text-slate-600 font-mono truncate">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="text-xs bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 transition-colors flex items-center gap-1.5 flex-shrink-0 ml-2 shadow-sm hover:shadow"
          aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="flex-shrink-0"
          >
            {copied ? (
              <>
                <path d="M20 6L9 17L4 12" />
              </>
            ) : (
              <>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </>
            )}
          </svg>
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <div className="relative">
        <pre ref={codeRef} className="p-4 overflow-x-auto text-sm">
          <code className="text-slate-800 font-mono whitespace-pre-wrap break-words">{code}</code>
        </pre>
      </div>
    </div>
  );
} 