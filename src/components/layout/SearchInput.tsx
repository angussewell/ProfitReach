'use client';

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          className={cn(
            "pl-10 bg-white border-0 shadow-sm hover:shadow transition-shadow",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export default SearchInput; 