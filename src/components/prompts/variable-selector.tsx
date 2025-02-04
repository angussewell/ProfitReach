import { useEffect, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface WebhookField {
  name: string;
  originalName: string;
  description?: string;
}

interface VariableSelectorProps {
  onSelect: (variable: string) => void;
  className?: string;
}

export function VariableSelector({ onSelect, className }: VariableSelectorProps) {
  const [fields, setFields] = useState<WebhookField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFields() {
      try {
        const response = await fetch("/api/webhook-fields");
        if (!response.ok) throw new Error("Failed to fetch webhook fields");
        const data = await response.json();
        setFields(data); // API returns array directly
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load webhook fields");
      } finally {
        setIsLoading(false);
      }
    }
    fetchFields();
  }, []);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading variables...</div>;
  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (!fields.length) return <div className="text-sm text-muted-foreground">No variables available</div>;

  const options = fields.map(field => ({
    value: field.name,
    label: `${field.originalName} (${field.name})${field.description ? ` - ${field.description}` : ""}`
  }));

  return (
    <div className={className}>
      <SearchableSelect
        options={options}
        onChange={value => onSelect(`{${value}}`)}
        placeholder="Search variables..."
        emptyMessage="No matching variables found"
      />
    </div>
  );
} 