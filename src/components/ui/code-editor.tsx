'use client';

import * as React from 'react';
import Editor from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { Maximize2, Minimize2 } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'html' | 'markdown' | 'json';
  className?: string;
  height?: string;
  onSave?: () => void;
  maxLength?: number;
}

export function CodeEditor({
  value,
  onChange,
  language = 'html',
  className,
  height = '400px',
  onSave,
  maxLength
}: CodeEditorProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);

  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    automaticLayout: true,
    fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
    padding: { top: 16, bottom: 16 },
    lineHeight: 1.6,
    fontLigatures: true,
    bracketPairColorization: { enabled: true },
    formatOnPaste: true,
    formatOnType: true,
    tabSize: 2,
    insertSpaces: true,
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      useShadows: false,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10
    },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    renderIndentGuides: true,
    colorDecorators: true,
    contextmenu: true,
    mouseWheelZoom: true,
    suggest: {
      showWords: false
    }
  };

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  // Handle fullscreen
  React.useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const characterCount = value.length;
  const progress = maxLength ? (characterCount / maxLength) * 100 : 0;
  const progressColor = progress > 90 ? 'bg-red-500' : progress > 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div 
      ref={editorRef}
      className={cn(
        'relative rounded-sm border border-border overflow-hidden',
        'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
        isFullscreen && 'fixed inset-4 z-50 border-none rounded-lg shadow-2xl',
        className
      )}
      style={isFullscreen ? { height: 'calc(100vh - 2rem)' } : undefined}
    >
      <div className="absolute top-0 left-0 right-0 h-8 bg-card border-b border-border px-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-xs font-mono text-muted-foreground">
            {language.toUpperCase()}
          </span>
          {maxLength && (
            <div className="flex items-center space-x-2">
              <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-300", progressColor)} 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {characterCount}/{maxLength}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsFullscreen(prev => !prev)}
          className="p-1 hover:bg-muted/50 rounded-sm transition-colors"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
      <Editor
        height={isFullscreen ? 'calc(100% - 2rem)' : height}
        defaultLanguage={language}
        value={value}
        onChange={(value) => onChange(value || '')}
        theme="vs-dark"
        options={editorOptions}
        className="technical-scrollbar"
        loading={
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted-foreground">Loading editor...</span>
          </div>
        }
      />
    </div>
  );
} 