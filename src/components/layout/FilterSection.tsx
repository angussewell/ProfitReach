import React from 'react';
import { Plus, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function FilterSection() {
  return (
    <div className="flex items-center justify-between py-4 mb-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/90 hover:bg-primary/5"
          >
            <Plus className="w-4 h-4 mr-1" />
            Quick filters
          </Button>
          <span className="text-border">|</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-foreground hover:text-foreground/90 hover:bg-primary/5"
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            Advanced filters
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="link"
          size="sm"
          className="text-primary hover:text-primary/90"
        >
          Manage dashboards
        </Button>
        <div className="flex items-center gap-2">
          <span className="technical-label">Assigned:</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/90 hover:bg-primary/5"
          >
            Everyone can edit
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
} 