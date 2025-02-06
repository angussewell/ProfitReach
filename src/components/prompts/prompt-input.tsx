import { VariableSelector } from "./variable-selector";
import { CodeEditor } from "@/components/ui/code-editor";
import type { editor } from 'monaco-editor';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
  isSubjectLine?: boolean;
}

export function PromptInput({ 
  value, 
  onChange, 
  className,
  placeholder,
  rows = 4,
  isSubjectLine = false
}: PromptInputProps) {
  const handleVariableSelect = (variable: string) => {
    // For now, we'll just append the variable at the end
    // The cursor position handling will be managed by the CodeEditor
    onChange(value + variable);
  };

  const height = isSubjectLine ? 40 : Math.max(rows * 32, 400);

  const subjectLineOptions = isSubjectLine ? {
    lineNumbers: 'off' as const,
    scrollBeyondLastLine: false,
    scrollbar: {
      vertical: 'hidden' as const,
      horizontal: 'hidden' as const,
      useShadows: false,
      verticalScrollbarSize: 0,
      horizontalScrollbarSize: 0,
      alwaysConsumeMouseWheel: false
    },
    wordWrap: 'on' as const,
    minimap: { enabled: false },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    renderLineHighlight: 'none' as const,
    contextmenu: false,
    mouseWheelZoom: false,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
    folding: false,
    fixedOverflowWidgets: true,
    padding: { top: 8, bottom: 8, left: 32, right: 16 },
    renderValidationDecorations: 'off' as const,
    matchBrackets: 'never' as const,
    occurrencesHighlight: 'off' as const,
    renderIndentGuides: false,
    colorDecorators: false,
    selectionHighlight: false,
    glyphMargin: false,
    renderFinalNewline: 'off' as const,
    smoothScrolling: true,
    guides: {
      indentation: false,
      highlightActive: false,
      bracketPairs: false
    }
  } : undefined;

  return (
    <div className={className}>
      <div className="mb-2">
        <VariableSelector onSelect={handleVariableSelect} />
      </div>
      <div className={isSubjectLine ? "overflow-hidden relative h-[40px]" : ""}>
        <CodeEditor
          value={value}
          onChange={onChange}
          language="markdown"
          height={`${height}px`}
          className={`
            ${isSubjectLine ? "min-h-[40px] max-h-[40px] !overflow-hidden subject-line-editor" : rows === 1 ? "min-h-[40px]" : "min-h-[400px]"}
          `}
          maxLength={8000}
          editorOptions={subjectLineOptions}
        />
      </div>
    </div>
  );
} 