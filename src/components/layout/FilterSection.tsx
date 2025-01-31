import React from 'react';
import { Plus, SlidersHorizontal, ChevronDown } from 'lucide-react';

export default function FilterSection() {
  return (
    <div className="flex items-center justify-between py-4 mb-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-red-500 hover:text-red-600">
            <Plus className="w-4 h-4" />
            Quick filters
          </button>
          <span className="text-gray-300">|</span>
          <button className="flex items-center gap-1 text-slate-800 hover:text-slate-600">
            <SlidersHorizontal className="w-4 h-4" />
            Advanced filters
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a href="#" className="text-red-500 hover:text-red-600 text-sm">
          Manage dashboards
        </a>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Assigned:</span>
          <button className="flex items-center gap-1 text-red-500 hover:text-red-600">
            Everyone can edit
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 