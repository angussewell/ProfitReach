import React from 'react';
import { Plus, SlidersHorizontal, ChevronDown } from 'lucide-react';

export default function FilterSection() {
  return (
    <div className="flex items-center justify-between py-4 mb-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-[#0091ae] hover:text-[#0091ae]/80">
            <Plus className="w-4 h-4" />
            Quick filters
          </button>
          <span className="text-gray-300">|</span>
          <button className="flex items-center gap-1 text-[#33475b] hover:text-[#33475b]/80">
            <SlidersHorizontal className="w-4 h-4" />
            Advanced filters
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a href="#" className="text-[#0091ae] hover:text-[#0091ae]/80 text-sm">
          Manage dashboards
        </a>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Assigned:</span>
          <button className="flex items-center gap-1 text-[#0091ae] hover:text-[#0091ae]/80">
            Everyone can edit
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 