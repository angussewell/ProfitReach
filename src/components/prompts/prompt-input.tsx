import { VariableSelector } from "./variable-selector";
import { CodeEditor } from "@/components/ui/code-editor";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
}

export function PromptInput({ 
  value, 
  onChange, 
  className,
  placeholder,
  rows = 4
}: PromptInputProps) {
  const handleVariableSelect = (variable: string) => {
    // For now, we'll just append the variable at the end
    // The cursor position handling will be managed by the CodeEditor
    onChange(value + variable);
  };

  return (
    <div className={className}>
      <div className="mb-2">
        <VariableSelector onSelect={handleVariableSelect} />
      </div>
      <CodeEditor
        value={value}
        onChange={onChange}
        language="markdown"
        height={`${Math.max(rows * 32, 400)}px`}
        className="min-h-[400px]"
        maxLength={8000}
      />
    </div>
  );
} 