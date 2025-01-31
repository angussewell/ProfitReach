'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className
}: SearchInputProps) {
  return (
    <div className={cn("relative max-w-2xl", className)}>
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-12 h-12 border border-gray-200 focus:border-red-500 focus:ring-red-100 transition-all duration-200 shadow-sm hover:shadow bg-white rounded-xl text-base"
      />
    </div>
  );
} 