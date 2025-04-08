'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useDebouncedCallback } from 'use-debounce';

interface SearchBarProps {
  onSearch: (term: string) => void;
  placeholder?: string;
  initialValue?: string;
  debounceMs?: number;
}

const SearchBar = ({
  onSearch,
  placeholder = "Search contacts...",
  initialValue = "",
  debounceMs = 400
}: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = React.useState(initialValue);
  
  // Debounce the search callback to avoid triggering on every keystroke
  const debouncedSearch = useDebouncedCallback((value: string) => {
    onSearch(value);
  }, debounceMs);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
      </div>
      <Input
        type="search"
        variant="search"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleChange}
        className="h-10 rounded-md border border-input bg-white shadow-sm"
      />
    </div>
  );
};

export default SearchBar;
