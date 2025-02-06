'use client';

import { FilterBuilder } from '@/components/filters/FilterBuilder';
import { Filter } from '@/types/filters';

interface FilterSectionProps {
  initialFilters: Filter[];
  fields: string[];
  onChange: (filters: Filter[]) => void;
}

export function FilterSection({ initialFilters, fields, onChange }: FilterSectionProps) {
  return (
    <FilterBuilder
      initialFilters={initialFilters}
      fields={fields}
      onChange={onChange}
    />
  );
} 