'use client';

import { FilterBuilder } from '@/components/filters/FilterBuilder';
import { Filter } from '@/types/filters';

interface FilterSectionProps {
  initialFilters: Filter[];
  fields: any[];
  hiddenInputId?: string;
}

export function FilterSection({ initialFilters, fields, hiddenInputId = 'filters-json' }: FilterSectionProps) {
  const handleFilterChange = (newFilters: Filter[]) => {
    const input = document.getElementById(hiddenInputId) as HTMLInputElement;
    if (input) {
      input.value = JSON.stringify(newFilters);
    }
  };

  return (
    <FilterBuilder
      initialFilters={initialFilters}
      fields={fields}
      onChange={handleFilterChange}
    />
  );
} 