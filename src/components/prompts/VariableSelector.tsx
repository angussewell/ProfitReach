'use client';

import * as React from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/components/ui/use-toast';

interface VariableSelectorProps {
  onSelect: (variable: string) => void;
  className?: string;
}

export function VariableSelector({ onSelect, className }: VariableSelectorProps) {
  const [fields, setFields] = React.useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch('/api/webhook-fields');
        if (!response.ok) throw new Error('Failed to fetch webhook fields');
        const data = await response.json();
        
        // Transform the fields into options
        const options = data.map((field: { name: string; originalName: string }) => ({
          value: field.name,
          label: field.originalName || field.name
        }));
        
        setFields(options);
        setError(null);
      } catch (err) {
        setError('Failed to load variables');
        toast({
          title: 'Error',
          description: 'Failed to load variables. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, [toast]);

  const handleSelect = (value: string) => {
    const field = fields.find(f => f.value === value);
    if (field) {
      onSelect(`{{${field.value}}}`);
    }
  };

  return (
    <div className={className}>
      <SearchableSelect
        options={fields}
        onChange={handleSelect}
        placeholder={loading ? 'Loading variables...' : error ? 'Error loading variables' : 'Search variables...'}
        emptyMessage={error ? 'Failed to load variables' : 'No variables found'}
      />
    </div>
  );
} 